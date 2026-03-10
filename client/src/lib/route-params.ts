export function parseRouteParamId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}