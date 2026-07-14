import type { FastifyReply } from "fastify";

export const FLASH_COOKIE_NAME = "nxdi_flash";
export type FlashMessage = { id: string; title: string; description?: string; tone?: "success" | "error" | "info" };

const errors: Record<string, string> = {
  terms_required: "약관 동의가 필요합니다",
  dividend_policy_required: "배당 정책 확인 동의가 필요합니다",
  withdrawal_limit: "출금 가능 금액을 다시 확인해주세요",
  login_required: "로그인이 필요합니다",
  trade_not_found: "거래를 적용할 종목을 찾을 수 없습니다",
  trade_insufficient: "매도 수량이 현재 보유 수량보다 큽니다",
  invalid_exchange_rate: "환율 입력값을 다시 확인해주세요",
  status_principal_invariant: "승인 출금 합계는 승인 투자원금을 초과할 수 없습니다",
  snapshot_not_found: "확정할 스냅샷을 찾을 수 없습니다",
  dividend_sync_failed: "외부 배당 데이터를 가져오지 못했습니다",
  oauth_state: "OAuth state 검증에 실패했습니다. 다시 로그인하세요.",
  not_eligible: "재학생 또는 졸업생으로 확인되지 않아 이용할 수 없습니다.",
  oauth_origin: "접속 주소와 OAuth 콜백 주소가 다릅니다. 같은 주소로 접속하세요.",
  oauth_failed: "DataGSM 로그인 처리 중 오류가 발생했습니다.",
  datagsm_not_configured: "DataGSM OAuth 환경변수가 아직 설정되지 않았습니다."
};

export function errorFlash(code: string): FlashMessage {
  return { id: `error-${code}`, title: errors[code] ?? "입력값을 다시 확인해주세요", tone: "error" };
}

export function successFlash(id: string, title: string): FlashMessage {
  return { id, title, tone: "success" };
}

export function setFlash(reply: FastifyReply, message: FlashMessage) {
  reply.setCookie(FLASH_COOKIE_NAME, Buffer.from(JSON.stringify(message)).toString("base64url"), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
    path: "/"
  });
}

export function redirectWithFlash(reply: FastifyReply, path: string, message: FlashMessage, statusCode = 303) {
  setFlash(reply, message);
  return reply.redirect(path, statusCode);
}
