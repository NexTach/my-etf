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
        <Field htmlFor="monthly-ledger-dividend-krw" label="실배당 합계 (원)">
          <FormattedNumberInput
            id="monthly-ledger-dividend-krw"
            min="0"
            name="actualDividendKrw"
            placeholder="실배당 합계"
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
