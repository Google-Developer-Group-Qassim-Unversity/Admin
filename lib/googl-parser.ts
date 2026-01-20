type FormSchema = {
  items?: Array<FormItem>;
};

type FormItem = {
  title?: string;
  questionItem?: {
    question?: {
      questionId?: string;
      choiceQuestion?: {
        type?: string;
        options?: Array<{ value?: string }>;
      };
      textQuestion?: Record<string, unknown>;
    };
  };
};

export type FormResponse = {
  answers?: Record<
    string,
    {
      questionId?: string;
      textAnswers?: { answers?: Array<{ value?: string }> };
    }
  >;
};

type TitleToAnswer = Record<string, string | string[] | null>;

function buildQuestionIdToTitleMap(schema: FormSchema): Map<string, string> {
  const map = new Map<string, string>();

  for (const item of schema.items ?? []) {
    const qid = item.questionItem?.question?.questionId;
    const title = item.title;
    if (qid && title) map.set(qid, title);
  }

  return map;
}

function extractTextAnswerValues(answer: unknown): string[] {
  const a = answer as {
    textAnswers?: { answers?: Array<{ value?: string }> };
  };

  return (
    a.textAnswers?.answers
      ?.map((x) => x?.value)
      .filter((v): v is string => typeof v === "string") ?? []
  );
}

function mapSingleResponseToTitleAnswers(
  qidToTitle: Map<string, string>,
  response: FormResponse
): TitleToAnswer {
  const out: TitleToAnswer = {};

  for (const [questionId, title] of qidToTitle.entries()) {
    const rawAnswer = response.answers?.[questionId];
    const values = rawAnswer ? extractTextAnswerValues(rawAnswer) : [];

    if (values.length === 0) out[title] = null;
    else if (values.length === 1) out[title] = values[0] ?? null; // <- Fix TS2322
    else out[title] = values;
  }

  return out;
}

export function mapSchemaToTitleAnswers(
  schema: FormSchema,
  responses: FormResponse[]
): TitleToAnswer[] {
  const qidToTitle = buildQuestionIdToTitleMap(schema);
  return responses.map((response) =>
    mapSingleResponseToTitleAnswers(qidToTitle, response)
  );
}