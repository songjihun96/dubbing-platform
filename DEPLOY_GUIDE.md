# 🎙️ 더빙팀 음성 관리 플랫폼 — 배포 가이드

## 📋 목차
1. [사전 준비](#사전-준비)
2. [MongoDB Atlas 설정](#1-mongodb-atlas-설정)
3. [Railway 서버 배포](#2-railway-서버-배포)
4. [Vercel 프론트엔드 배포](#3-vercel-프론트엔드-배포)
5. [최초 관리자 계정 생성](#4-최초-관리자-계정-생성)
6. [기능 설명](#기능-설명)
7. [주의사항](#주의사항)

---

## 사전 준비

필요한 계정 (모두 무료):
- **GitHub** 계정: https://github.com
- **MongoDB Atlas** 계정: https://mongodb.com/atlas
- **Railway** 계정: https://railway.app (GitHub으로 로그인)
- **Vercel** 계정: https://vercel.com (GitHub으로 로그인)

로컬에 설치 필요:
- **Node.js** (v18 이상): https://nodejs.org
- **Git**: https://git-scm.com

---

## 1. MongoDB Atlas 설정

### 1-1. 클러스터 생성
1. https://mongodb.com/atlas 접속 후 회원가입
2. "Build a Database" 클릭
3. **Free (M0)** 선택 → 지역은 `AWS / Seoul (ap-northeast-2)` 선택
4. 클러스터 이름: `dubbing-cluster` → "Create" 클릭

### 1-2. 데이터베이스 사용자 생성
1. 왼쪽 메뉴 "Database Access" 클릭
2. "Add New Database User" 클릭
3. Authentication Method: **Password**
4. Username: `dubbingadmin` (원하는 이름)
5. Password: 안전한 비밀번호 설정 후 **반드시 복사해두기**
6. Database User Privileges: "Read and write to any database" 선택
7. "Add User" 클릭

### 1-3. 네트워크 접근 허용
1. 왼쪽 메뉴 "Network Access" 클릭
2. "Add IP Address" 클릭
3. "Allow Access from Anywhere" 클릭 (0.0.0.0/0)
4. "Confirm" 클릭

### 1-4. 연결 문자열 복사
1. 왼쪽 "Database" 클릭 → "Connect" 버튼
2. "Drivers" 선택
3. 연결 문자열 복사 (형식: `mongodb+srv://username:password@cluster...`)
4. `<password>` 부분을 실제 비밀번호로 교체
5. URI 끝에 `/dubbing-platform` 추가:
   ```
   mongodb+srv://dubbingadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dubbing-platform
   ```

---

## 2. Railway 서버 배포

### 2-1. GitHub에 코드 올리기
```bash
# 프로젝트 폴더에서 실행
cd dubbing-platform
git init
git add .
git commit -m "Initial commit"

# GitHub에서 새 repository 만들고 (예: dubbing-platform)
git remote add origin https://github.com/YOUR_USERNAME/dubbing-platform.git
git branch -M main
git push -u origin main
```

### 2-2. Railway 프로젝트 생성
1. https://railway.app 접속 → GitHub으로 로그인
2. "New Project" → "Deploy from GitHub repo" 클릭
3. `dubbing-platform` 저장소 선택

### 2-3. 서버 서비스 설정
Railway가 자동으로 배포를 시작합니다. 설정을 수정해야 합니다:

1. 생성된 서비스 클릭 → "Settings" 탭
2. **Root Directory**: `/server` 입력
3. **Build Command**: `npm install`
4. **Start Command**: `node index.js`

### 2-4. 환경 변수 설정
"Variables" 탭에서 아래 변수들 추가:

| 변수명 | 값 |
|--------|-----|
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 |
| `JWT_SECRET` | 랜덤한 긴 문자열 (예: `my-super-secret-key-2024-dubbing`) |
| `PORT` | `5000` |
| `CLIENT_URL` | (나중에 Vercel URL로 업데이트) |

5. "Deploy" 클릭

### 2-5. 서버 URL 확인
- Settings → Domains 탭에서 Railway 제공 URL 확인
- 예: `https://dubbing-platform-server.up.railway.app`

---

## 3. Vercel 프론트엔드 배포

### 3-1. 환경 변수 파일 생성
`client/.env.production` 파일을 만들고:
```
REACT_APP_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

GitHub에 push:
```bash
git add .
git commit -m "Add production env"
git push
```

### 3-2. Vercel 배포
1. https://vercel.com 접속 → GitHub으로 로그인
2. "New Project" → `dubbing-platform` 저장소 선택
3. **Framework Preset**: Create React App
4. **Root Directory**: `client` 클릭해서 설정
5. **Environment Variables** 섹션에서:
   - `REACT_APP_API_URL` = `https://YOUR-RAILWAY-URL.up.railway.app`
6. "Deploy" 클릭

### 3-3. Railway CLIENT_URL 업데이트
Vercel 배포 완료 후 나오는 URL(예: `https://dubbing-platform.vercel.app`)을  
Railway Variables의 `CLIENT_URL`에 업데이트

---

## 4. 최초 관리자 계정 생성

배포 완료 후 **최초 1회만** 아래 API를 호출해 관리자 계정을 만듭니다.

### 방법 A: 브라우저에서 (간단)
1. https://hoppscotch.io 또는 https://reqbin.com 접속
2. POST 요청:
   - URL: `https://YOUR-RAILWAY-URL.up.railway.app/api/auth/init`
   - Body (JSON):
   ```json
   {
     "username": "admin",
     "password": "your-strong-password",
     "displayName": "관리자"
   }
   ```
3. 전송 → `"최초 관리자 계정이 생성되었습니다"` 응답 확인

### 방법 B: curl 커맨드 (터미널)
```bash
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/auth/init \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password","displayName":"관리자"}'
```

> ⚠️ **주의**: 이 API는 DB에 계정이 하나도 없을 때만 작동합니다. 두 번째 호출부터는 자동으로 거부됩니다.

---

## 기능 설명

### 📊 상태 색상 의미
| 색상 | 상태 | 설명 |
|------|------|------|
| 🟡 노란색 | 검토 대기 | 파일 업로드됨, 관리자 확인 전 |
| 🟢 초록색 | 통과 | 관리자가 승인 처리 |
| 🟠 주황색 | 재녹음 요청 | 피드백과 함께 재녹음 요청 |
| 🔴 빨간색 | 기한 초과 | 마감일 이후 업로드됨 |

### 🔐 권한 구조
- **관리자**: 모든 멤버 음성 열람, 과제 부여, 검토/승인, 계정 관리
- **일반 멤버**: 본인 과제 확인, 음성 업로드, 본인 파일만 열람
- **관리자 권한 부여/해제**: 관리자 패널에서 멤버 카드의 버튼으로 가능

### 🔔 알림 시스템
- 관리자가 녹음 승인/피드백 처리 시 해당 멤버에게 알림
- 새 과제 부여 시 알림
- 사이드바 🔔 버튼으로 알림 패널 열기
- 30초마다 자동 새로고침

### 🗂️ 파일 저장
- 업로드된 파일은 서버의 `uploads/` 폴더에 저장
- 3개월 경과 시 자동 삭제 (매일 자정 실행)
- Railway 재배포 시 파일이 사라질 수 있음 → 대용량 운영 시 AWS S3 연동 권장

---

## 주의사항

### Railway 무료 플랜 한계
- 월 **500시간** 무료 (약 20일)
- 지속 운영을 위해 월 $5 Hobby 플랜 권장
- 파일은 서버 재시작 시 삭제될 수 있음 (영구 저장은 볼륨 설정 필요)

### 파일 영구 저장 (선택사항)
Railway에서 Volume 추가:
1. 서비스 → "Add Volume"
2. Mount Path: `/app/server/uploads`
3. 이렇게 하면 재배포 후에도 파일 유지

### 보안 체크리스트
- [ ] JWT_SECRET을 추측 불가능한 랜덤 문자열로 설정
- [ ] MongoDB 비밀번호를 강력하게 설정
- [ ] 운영 시작 전 init API가 더 이상 작동하지 않는지 확인
- [ ] 관리자 계정 비밀번호 안전하게 보관

---

## 문제 해결

### "CORS 오류" 발생 시
Railway Variables에서 `CLIENT_URL`이 Vercel URL과 정확히 일치하는지 확인

### MongoDB 연결 실패 시
- Atlas Network Access에서 `0.0.0.0/0` 허용 확인
- 연결 문자열에 비밀번호가 올바르게 입력되었는지 확인

### 파일 업로드 실패 시
- 파일이 오디오 형식인지 확인 (MP3, WAV, M4A, OGG 등)
- 파일 크기 100MB 이하인지 확인
