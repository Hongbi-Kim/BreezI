// New report processing logic with proper warning count management

// Process report (Admin only)
app.post("/make-server-58f75568/admin/reports/:reportId/process", async (c) => {
  try {
    const adminUserId = await verifyAuth(c.req.header('Authorization'));
    if (!adminUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser(c.req.header('Authorization')?.split(' ')[1]);
    if (!user || user.email !== 'khb1620@naver.com') {
      return c.json({ error: "Admin access required" }, 403);
    }
    
    const reportId = c.req.param('reportId');
    const { action } = await c.req.json(); // 'suspend', 'warning', 'ignore'
    
    console.log(`🔍 Processing report ${reportId} with action: ${action}`);
    
    const report = await kv.get(`report:${reportId}`);
    if (!report) {
      console.log(`❌ Report ${reportId} not found`);
      return c.json({ error: "Report not found" }, 404);
    }
    
    const targetProfile = await kv.get(`profile:${report.targetUserId}`);
    if (!targetProfile) {
      console.log(`User profile not found for ${report.targetUserId}`);
      return c.json({ error: "User profile not found" }, 404);
    }
    
    console.log(`📋 Current report status: ${report.status}, previous action: ${report.action || 'none'}, new action: ${action}`);
    
    // STEP 1: Undo previous action if this report was already processed
    if (report.status === 'processed' && report.action) {
      console.log(`⏪ Undoing previous action: ${report.action}`);
      
      if (report.action === 'warning') {
        // Decrease warning count
        if (targetProfile.warningCount > 0) {
          targetProfile.warningCount = targetProfile.warningCount - 1;
          console.log(`📉 Decreased warning count to: ${targetProfile.warningCount}`);
        }
      } else if (report.action === 'suspend') {
        // If user was suspended by this specific report, consider reactivating
        if (targetProfile.suspendReportId === reportId) {
          console.log(`⏪ User was suspended by this report, will be handled by new action`);
        }
      }
    }
    
    // STEP 2: Apply new action
    let contentPreview = '내용 없음';
    
    // Try to get content from savedContent first, then from actual post/comment
    if (report.targetType === 'post') {
      if (report.savedContent?.title) {
        contentPreview = `"${report.savedContent.title}"`;
      } else {
        const post = await kv.get(`communitypost:${report.targetId}`);
        if (post?.title) {
          contentPreview = `"${post.title}"`;
        }
      }
    } else if (report.targetType === 'comment') {
      if (report.savedContent?.content) {
        contentPreview = `"${report.savedContent.content.substring(0, 50)}..."`;
      } else {
        const comment = await kv.get(`communitycomment:${report.targetId}`);
        if (comment?.content) {
          contentPreview = `"${comment.content.substring(0, 50)}..."`;
        }
      }
    }
    
    if (action === 'suspend') {
      // Suspend the target user
      targetProfile.status = 'suspended';
      targetProfile.suspendedAt = new Date().toISOString();
      targetProfile.suspendReason = `신고 접수 - ${report.reason}\n${report.targetType === 'post' ? '게시글' : '댓글'}: ${contentPreview}`;
      targetProfile.suspendReportId = reportId;
      await kv.set(`profile:${report.targetUserId}`, targetProfile);
      console.log(`✅ User ${report.targetUserId} suspended, reason saved: ${contentPreview}`);
      
      // Send notification about suspension
      const suspendNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const suspendNotification = {
        id: suspendNotificationId,
        userId: report.targetUserId,
        type: 'suspended',
        title: '계정 정지',
        message: `회원님의 ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}이(가) 신고되어 계정이 정지되었습니다.\n사유: ${report.reason}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: report.targetId,
        relatedType: report.targetType
      };
      await kv.set(`notification:${report.targetUserId}:${suspendNotificationId}`, suspendNotification);
      console.log(`📧 Suspension notification sent to user ${report.targetUserId}`);
      
    } else if (action === 'warning') {
      // Increment warning count
      targetProfile.warningCount = (targetProfile.warningCount || 0) + 1;
      console.log(`⚠️ User ${report.targetUserId} warning count increased to: ${targetProfile.warningCount}`);
      
      if (targetProfile.warningCount >= 5) {
        // Auto-suspend
        targetProfile.status = 'suspended';
        targetProfile.suspendedAt = new Date().toISOString();
        targetProfile.suspendReason = `누적 경고 5회 - 최근 사유: ${report.reason}\n${report.targetType === 'post' ? '게시글' : '댓글'}: ${contentPreview}`;
        targetProfile.suspendReportId = reportId;
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`🚫 User ${report.targetUserId} auto-suspended due to 5 warnings`);
        
        // Send suspension notification
        const suspendNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const suspendNotification = {
          id: suspendNotificationId,
          userId: report.targetUserId,
          type: 'suspended',
          title: '계정 정지 (누적 경고 5회)',
          message: `누적 경고 횟수 5회 도달로 계정이 정지되었습니다.\n최근 위반 내용: ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}\n사유: ${report.reason}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${suspendNotificationId}`, suspendNotification);
        console.log(`📧 Suspension notification sent to user ${report.targetUserId}`);
      } else {
        // Save profile with updated warning count
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        
        // Send warning notification with count
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
          id: notificationId,
          userId: report.targetUserId,
          type: 'warning',
          title: `경고 (${targetProfile.warningCount}/5)`,
          message: `회원님의 ${report.targetType === 'post' ? '게시글' : '댓글'} ${contentPreview}이(가) 신고되어 경고 조치되었습니다.\n사유: ${report.reason}\n누적 경고: ${targetProfile.warningCount}회 (5회 시 계정 정지)`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${notificationId}`, notification);
        console.log(`📧 Warning notification sent to user ${report.targetUserId} (${targetProfile.warningCount}/5)`);
      }
      
    } else if (action === 'ignore') {
      // If ignoring the report, check if user was suspended by this report and reactivate
      if (targetProfile.suspendReportId === reportId) {
        targetProfile.status = 'active';
        targetProfile.suspendReason = null;
        targetProfile.suspendedAt = null;
        targetProfile.suspendReportId = null;
        targetProfile.activatedAt = new Date().toISOString();
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`✅ User ${report.targetUserId} reactivated because report ${reportId} was ignored`);
        
        // Send notification about reactivation
        const reactivateNotificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reactivateNotification = {
          id: reactivateNotificationId,
          userId: report.targetUserId,
          type: 'reactivated',
          title: '계정 활성화',
          message: '신고가 무시 처리되어 계정이 다시 활성화되었습니다.',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: report.targetId,
          relatedType: report.targetType
        };
        await kv.set(`notification:${report.targetUserId}:${reactivateNotificationId}`, reactivateNotification);
      } else {
        // Just save the profile (warning count might have been decreased)
        await kv.set(`profile:${report.targetUserId}`, targetProfile);
        console.log(`✅ Warning count updated for user ${report.targetUserId}`);
      }
    }
    
    // STEP 3: Update report status
    report.status = 'processed';
    report.processedAt = new Date().toISOString();
    report.processedBy = adminUserId;
    report.action = action;
    
    console.log(`✏️ Updating report with action: ${action}`);
    await kv.set(`report:${reportId}`, report);
    console.log(`✅ Report ${reportId} saved with action: ${action}`);
    
    console.log(`✅ Report ${reportId} processed successfully with action: ${action}`);
    return c.json({ success: true, report });
  } catch (error) {
    console.log(`Process report error: ${error}`);
    console.error(error);
    return c.json({ error: "Failed to process report" }, 500);
  }
});
