"use client";

import { ApiMutationForm } from "@/app/components/api-mutation-form";
import { FormattedNumberInput } from "@/app/components/formatted-number-input";
import { Field, InlineFields } from "@/app/components/tds";

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyDividendRecordForm() {
  return (
    <ApiMutationForm
      action="/api/admin/dividends/monthly/record"
      className="form compact monthly-dividend-form"
      method="post"
      resetOnSuccess
    >
      <InlineFields variant="monthly-dividend">
        <Field htmlFor="actual-dividend-month" label="배당월">
          <input
            id="actual-dividend-month"
            name="dividendMonth"
            type="month"
            defaultValue={currentMonthValue()}
            required
          />
        </Field>
        <Field htmlFor="monthly-ledger-dividend-krw" label="외부 원장 실배당 합계 (원)">
          <FormattedNumberInput
            id="monthly-ledger-dividend-krw"
            min="0"
            name="actualDividendKrw"
            placeholder="증권사 월 합계"
            required
          />
        </Field>
        <Field htmlFor="actual-dividend-reference" label="증권사 기록 근거" wide>
          <input
            id="actual-dividend-reference"
            maxLength={500}
            name="externalReference"
            placeholder="월간 거래내역 식별값 또는 확인 경로"
            required
          />
        </Field>
        <button className="secondary" type="submit">
          월 합계 저장
        </button>
      </InlineFields>
    </ApiMutationForm>
  );
}
