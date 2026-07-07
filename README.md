# GSM Portfolio Intent

DataGSM OAuth로 로그인한 GSM 구성원이 운영 포트폴리오와 예상 배당을 확인하고, 투자/출금 의향서를 제출하는 서비스입니다.

## Setup

1. 환경변수를 만듭니다.

```bash
cp .env.example .env
```

2. `.env`에서 최소한 아래 값을 설정합니다.

```env
DATABASE_URL=mysql://user:password@host:3306/t-etf
APP_SESSION_SECRET=long-random-secret
DATAGSM_CLIENT_ID=...
DATAGSM_CLIENT_SECRET=...
DATAGSM_REDIRECT_URI=http://localhost:3000/api/auth/datagsm/callback
ADMIN_EMAILS=admin@gsm.hs.kr
OPENDART_API_KEY=...
```

3. 외부 MySQL에 빈 데이터베이스를 하나 만든 뒤 `.env`에 연결 문자열을 넣습니다.

```env
DATABASE_URL=mysql://user:password@host:3306/t-etf
```

4. Prisma로 테이블을 만들고 기본 포트폴리오/배당 데이터를 넣습니다.

```bash
npm run db:push
npm run db:seed
```

5. 개발 서버를 실행합니다.

```bash
npm run dev
```

## DataGSM Redirect URL

로컬 개발:

```txt
http://localhost:3000/api/auth/datagsm/callback
```

배포:

```txt
https://your-domain.com/api/auth/datagsm/callback
```

DataGSM client에 등록한 Redirect URL과 `.env`의 `DATAGSM_REDIRECT_URI`는 정확히 같아야 합니다.

## 필요한 키 발급처

- `DATAGSM_CLIENT_ID`, `DATAGSM_CLIENT_SECRET`: DataGSM OAuth 클라이언트 등록 후 발급받습니다. 등록 시 `DATAGSM_REDIRECT_URI`와 같은 콜백 URL을 넣어야 합니다.
- `OPENDART_API_KEY`: OpenDART 인증키 신청 페이지에서 발급받습니다. 국내 상장 종목 검색과 정기보고서 배당 데이터 조회에 사용합니다.
- `FMP_API_KEY`: Financial Modeling Prep 계정의 API Dashboard에서 발급받습니다. 미국 주식/ETF 검색과 배당 데이터 보강에 사용합니다.
- `APP_SESSION_SECRET`: 직접 생성하는 긴 랜덤 문자열입니다. 예: `openssl rand -base64 48`
- `DATABASE_URL`: 사용할 MySQL 서버에서 데이터베이스와 계정을 만든 뒤 연결 문자열로 작성합니다.

## DB에 저장되는 데이터

- `PortfolioHolding`: 운영 포트폴리오 종목
- `PortfolioSetting`: USD/KRW 환율
- `DividendRecord`: 종목별 배당 추정 데이터
- `InvestmentIntent`: 투자 의향서
- `WithdrawalIntent`: 출금 의향서

관리자 권한은 `ADMIN_EMAILS`에 포함된 DataGSM 로그인 이메일로 판별합니다.

## Market Data

종목 검색과 배당 데이터 일부를 외부 데이터 소스에서 가져올 수 있습니다.

- `GET /api/market/search?q=AAPL`: 종목 검색
- `/admin`의 배당 데이터 `외부 동기화`: 해당 심볼의 배당 데이터를 DB에 반영

우선순위:

1. `OPENDART_API_KEY`가 있으면 국내 상장 종목 검색과 배당 데이터를 OpenDART로 조회
2. `FMP_API_KEY`가 있으면 미국 주식/ETF 검색과 배당 데이터를 FMP로 조회
3. 없으면 Yahoo Finance 공개 엔드포인트를 best-effort fallback으로 사용

OpenDART는 `corpCode.xml`로 종목코드와 DART 고유번호를 매핑하고, `alotMatter.json`의 정기보고서 배당 항목을 사용합니다. 실제 배당락일/지급일 확정값은 공시 종류와 종목별 정책에 따라 추가 보강이 필요할 수 있어 관리자 화면에서 직접 수정할 수 있습니다.
