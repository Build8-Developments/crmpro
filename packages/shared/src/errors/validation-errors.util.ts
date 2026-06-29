export type ValidationErrorLike = {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorLike[];
};

export function formatValidationErrors(
  errors: ValidationErrorLike[],
): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const error of errors) {
    const messages = Object.values(error.constraints ?? {});

    if (messages.length > 0) {
      details[error.property] = messages;
    }
  }

  return details;
}
