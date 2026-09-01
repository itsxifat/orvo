import { toEnglishDigits, normalizeBdPhone, isValidBdMobile } from "@/lib/utils";

/**
 * Wire a phone input to react-hook-form so that whatever the customer types
 * becomes 01XXXXXXXXX — in the field, in front of them, before anything is
 * submitted.
 *
 * People write their own number in Bangla digits, with +880, with spaces,
 * dashes or brackets, or without the leading zero. Every one of those is the
 * same number, and the server has always normalised it anyway; doing it here
 * as well means the customer can SEE that their number was understood instead
 * of wondering whether the Bangla numerals they just typed will reach a rider.
 *
 * Two moments, deliberately:
 *   • as they type — non-ASCII numerals are transliterated. It is a 1:1 swap,
 *     so the field's length never changes and the caret does not jump.
 *   • on blur — the whole number is tidied to its local form, once they have
 *     finished with it. Nothing is rewritten mid-word.
 *
 * `format: false` normalises without judging the result — for places (the
 * account profile) that have no error slot to show a complaint in.
 */
export function bdPhoneField(
  register,
  setValue,
  name = "phone",
  { required = false, format = true, requiredMessage = "Please add a phone number" } = {}
) {
  const field = register(name, {
    required: required ? requiredMessage : false,
    // Covers paste-and-submit and browser autofill, where a blur may never
    // happen: the value react-hook-form hands to validation and to onSubmit is
    // always the normalised one.
    setValueAs: (v) => normalizeBdPhone(v),
    validate: (v) => {
      if (!v) return required ? requiredMessage : true;
      if (!format) return true;
      return isValidBdMobile(v) || "That doesn't look like a mobile number — 11 digits starting 01";
    },
  });

  return {
    ...field,
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
    onChange: (e) => {
      const ascii = toEnglishDigits(e.target.value);
      if (ascii !== e.target.value) {
        setValue(name, ascii, { shouldValidate: false, shouldDirty: true });
        return;
      }
      field.onChange(e);
    },
    onBlur: (e) => {
      const tidy = normalizeBdPhone(e.target.value);
      if (tidy && tidy !== e.target.value) setValue(name, tidy, { shouldDirty: true });
      field.onBlur(e);
    },
  };
}
