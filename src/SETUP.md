# BreezI 개발 환경 설정 가이드

## 🚀 빠른 시작

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

`.env` 파일을 열고 다음 값을 입력하세요:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Supabase 키 찾는 방법

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → API 메뉴로 이동
4. **Project URL**에서 프로젝트 ID 확인 (https://[프로젝트ID].supabase.co)
5. **Project API keys**에서 `anon` `public` 키 복사

### 2. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 3. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

## 🔐 보안 참고 사항

### Public Anon Key는 노출되어도 괜찮습니다

- `publicAnonKey`는 클라이언트에서 사용하도록 설계된 키입니다
- Row Level Security (RLS)로 데이터베이스가 보호됩니다
- 하지만 GitHub에 커밋하지 않는 것이 좋은 관행입니다

### 절대 노출하면 안 되는 키

⚠️ **SERVICE_ROLE_KEY**는 절대 프론트엔드 코드에 포함하지 마세요!

- `SUPABASE_SERVICE_ROLE_KEY`는 모든 권한을 가진 마스터 키입니다
- 백엔드(Supabase Edge Functions)에서만 사용해야 합니다
- 이 키는 Supabase 대시보드의 환경 변수로만 관리하세요

## 📦 프로젝트 구조

```
BreezI/
├── .env                    # 환경 변수 (Git 제외)
├── .env.example           # 환경 변수 템플릿
├── .gitignore             # Git 제외 파일
├── App.tsx                # 메인 앱 컴포넌트
├── components/            # React 컴포넌트
├── utils/
│   └── supabase/
│       ├── client.tsx     # Supabase 클라이언트
│       └── info.tsx       # 프로젝트 정보 (환경 변수 사용)
└── supabase/
    └── functions/
        └── server/        # Edge Functions (백엔드)
```

## 🌐 카카오 로그인 설정

### 1. 카카오 디벨로퍼스 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com) 접속
2. 애플리케이션 추가
3. REST API 키 복사

### 2. Supabase 설정

1. Supabase 대시보드 → Authentication → Providers
2. Kakao 활성화
3. 카카오 Client ID, Client Secret 입력
4. Redirect URL 설정:
   ```
   https://[프로젝트ID].supabase.co/auth/v1/callback
   ```

### 3. 카카오 Redirect URI 등록

카카오 디벨로퍼스에서 Redirect URI 등록:
```
https://[프로젝트ID].supabase.co/auth/v1/callback
```

자세한 가이드: https://supabase.com/docs/guides/auth/social-login/auth-kakao

## 🚢 배포

### Vercel 배포

1. Vercel에 프로젝트 연결
2. Environment Variables 설정:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy 버튼 클릭

### Netlify 배포

1. Netlify에 프로젝트 연결
2. Site settings → Environment variables 설정
3. Build & deploy

## 🐛 문제 해결

### 환경 변수가 적용되지 않을 때

1. 개발 서버 재시작
2. `.env` 파일 위치 확인 (프로젝트 루트에 있어야 함)
3. 환경 변수 이름이 `VITE_` 접두사로 시작하는지 확인

### "Failed to fetch" 오류

1. Supabase 프로젝트가 활성화되어 있는지 확인
2. API 키가 올바른지 확인
3. 네트워크 연결 확인

### 카카오 로그인 "Provider is not enabled" 오류

1. Supabase에서 Kakao provider가 활성화되어 있는지 확인
2. 카카오 앱 설정이 완료되었는지 확인
3. Redirect URI가 정확한지 확인

## 📞 지원

문의사항: khb1620@naver.com

## 📄 라이선스

베타 서비스 - 상업적 사용 전 문의 필요
