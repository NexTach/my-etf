"use client";

import { Save } from "lucide-react";
import { FormattedNumberInput } from "@/app/components/formatted-number-input";
import { Field, Form, InlineFields } from "@/app/components/tds";

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyDividendRecordForm() {
  return (
    <Form action="/api/admin/dividends/monthly/record" className="monthly-dividend-form" compact method="post">
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
        <Field htmlFor="actual-dividend-amount" label="월 전체 실 배당금">
          <FormattedNumberInput
            id="actual-dividend-amount"
            min="0"
            name="actualDividendKrw"
            placeholder="원화 금액"
            required
          />
        </Field>
        <Field htmlFor="actual-dividend-reference-value" label="기준 평가금액">
          <FormattedNumberInput
            id="actual-dividend-reference-value"
            min="1"
            name="referenceMarketValueKrw"
            placeholder="수익률 기준 금액"
            required
          />
        </Field>
        <Field htmlFor="actual-dividend-memo" label="메모" wide>
          <input id="actual-dividend-memo" maxLength={500} name="memo" placeholder="선택 입력" />
        </Field>
        <button className="secondary" type="submit">
          <Save size={17} />
          저장
        </button>
      </InlineFields>
    </Form>
  );
}
