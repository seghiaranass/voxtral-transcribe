// Single source of truth for the registration policy (spec §9).
// ALLOW_REGISTRATION="false" → single-operator mode: hide /register, reject the API.
export function registrationAllowed(): boolean {
  return process.env.ALLOW_REGISTRATION !== "false";
}
