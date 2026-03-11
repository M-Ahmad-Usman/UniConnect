
/*
Converts camelCase strings to snake_case.
Handles consecutive capital letters correctly:
- degreeLevel → degree_level
- userID → user_id (not user_i_d)
*/
export function convertCamelToSnakeCase(camelCase: string): string {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}