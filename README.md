# 뚝딱 대칭 공장 (Symmetry Factory)

만 5세~초등 2학년 어린이를 위한 인터랙티브 선대칭(거울 모드) 및 점대칭(빙글 모드) 교육용 웹 애플리케이션입니다.
어린이가 대칭축의 한쪽에 그림을 그리면 반대쪽에 실시간 또는 '짠!' 애니메이션으로 대칭 그림이 완성됩니다.

---

## 🚀 주요 기능
1. **거울 만들기 (선대칭)**: 세로, 가로, 둘 다(가로+세로) 대칭축 지원, 실시간 '바로 보기' 및 선물상자 종이 덮개 '짠! 보기' 모드.
2. **빙글 만들기 (점대칭)**: 중심점을 기준으로 180° 회전 대칭 실시간 및 짠! 회전 애니메이션.
3. **같이 만들기 (협동 모드)**: 화면을 반으로 나누어 두 명이 각자 자리에서 그리고 '거울 비추기'로 대칭 비교.
4. **무늬 탐정**: 공공데이터포털 한국문화정보원 전통문양 API 연동 및 내장 전통무늬 6종(연꽃, 태극, 박쥐, 바람개비, 꽃살, 구름) 대칭 탐구와 밑그림 따라 그리기.
5. **AI 작품 카드**: 완성된 대칭 작품을 분석하여 어린이 눈높이의 작품 이름, 묘사, 대칭 이야기, 보호자 대화 질문 자동 생성.
6. **내 작품 보관함**: 생성된 작품 및 AI 카드를 로컬 또는 Firebase Firestore에 저장하고 1024px 고화질 PNG로 내려받기.

---

## 🔑 환경 변수 안내

이 프로젝트는 보안을 위해 실제 API 키를 코드나 Git 저장소에 절대 포함하지 않습니다.
로컬 실행 시 `.env` 파일에, Vercel 배포 시 `Project Settings > Environment Variables`에 아래 환경 변수를 등록하세요.

> **주의**: 환경 변수를 추가하거나 수정한 후에는 반드시 **Vercel에서 재배포(Redeploy)**해야 변경 사항이 적용됩니다.

### 1. 브라우저용 환경 변수 (Firebase 웹 설정)
*발급 위치: [Firebase 콘솔](https://console.firebase.google.com) > 프로젝트 개요 옆 톱니바퀴(프로젝트 설정) > '내 앱' 섹션의 웹 앱 등록/설정*
- `VITE_FIREBASE_API_KEY`: Firebase 프로젝트 Web API Key
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase 인증 도메인 (`<project-id>.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID
- `VITE_FIREBASE_APP_ID`: Firebase 앱 ID

> **대체 동작**: 위 4개 변수 중 하나라도 비어 있으면 자동으로 브라우저 로컬 저장소(`localStorage`)를 사용하여 작품과 놀이 기록을 보관합니다.

### 2. 서버 전용 환경 변수 (Vercel Serverless Function)
*브라우저에 노출되지 않으며 `api/` 서버리스 함수에서만 안전하게 사용됩니다.*
- `DATA_GO_KR_SERVICE_KEY`: [공공데이터포털(data.go.kr)](https://www.data.go.kr) '한국문화정보원_전통문양' 오픈API 활용신청 후 마이페이지에서 발급받은 **일반 인증키 (Decoding)**
  - *대체 동작: 키가 없거나 호출 실패 시 내장된 6종의 전통 문양(연꽃, 태극, 박쥐 등)으로 자동 전환됩니다.*
- `OPENAI_API_KEY`: [OpenAI 플랫폼](https://platform.openai.com/api-keys)에서 발급받은 API Secret Key
- `OPENAI_MODEL`: 사용할 모델명 (권장: `gpt-4o-mini`)
  - *대체 동작: 키가 없거나 오류, 10초 타임아웃, 일일 사용량(기기당 30회) 초과 시 기본 작품 카드로 안전하게 대체됩니다.*

---

## 🔒 Firebase 설정 방법

1. **Firebase 콘솔 프로젝트 생성**:
   - [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트를 생성합니다.
2. **익명 인증(Anonymous Authentication) 활성화**:
   - 좌측 메뉴 `빌드 > Authentication > 로그인 방법`으로 이동합니다.
   - '익명(Anonymous)' 공급업체를 선택하고 **사용 설정(Enable)**을 켠 뒤 저장합니다.
   - *(앱을 열면 아이에게 로그인 창 없이 조용히 익명 계정이 생성되어 개인 작품이 안전하게 격리됩니다.)*
3. **Cloud Firestore 데이터베이스 생성**:
   - `빌드 > Firestore Database`로 이동하여 데이터베이스를 만듭니다.
4. **보안 규칙(firestore.rules) 적용**:
   - Firestore의 `규칙(Rules)` 탭으로 이동하여 프로젝트 루트의 `firestore.rules` 파일 내용을 붙여 넣고 **게시(Publish)**합니다:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

---

## 🧪 테스트 실행 방법

대칭 공식(선대칭, 점대칭, 좌표 변환 항등성, 합성 변환 검증) 테스트는 Vitest로 실행할 수 있습니다:

```bash
npm test
```

---

## ⚠️ 보안 주의사항
- `.env` 및 `.env.local` 파일은 `.gitignore`에 등록되어 있어야 하며, **GitHub나 공개 저장소에 절대로 커밋하거나 푸시하지 마세요**.
