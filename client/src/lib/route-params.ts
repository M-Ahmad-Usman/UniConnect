export function parseRouteParamId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRouteParamPublicId(value: string | undefined) {
  return value && UUID_V7_PATTERN.test(value) ? value.toLowerCase() : null;
}
