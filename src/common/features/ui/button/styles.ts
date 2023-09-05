import { ButtonAppearance, ButtonSize } from "@ui/button/props";

export const BUTTON_STYLES: Record<ButtonAppearance, string> = {
  primary: "bg-blue-dark-sky hover:bg-blue-dark-sky-hover focus:bg-blue-dark-sky-active text-white",
  secondary: "",
  link: "text-blue-dark-sky hover:text-blue-dark-sky-hover focus:text-blue-dark-sky-active",
  danger: "",
  success: "",
  warning: "",
  info: ""
};

export const BUTTON_OUTLINE_STYLES: Record<ButtonAppearance, string> = {
  primary:
    "border-blue-dark-sky hover:border-blue-dark-sky-hover focus:border-blue-dark-sky-active text-blue-dark-sky hover:text-blue-dark-sky-hover focus:text-blue-dark-sky-active",
  secondary: "",
  link: "",
  danger:
    "border-red hover:border-red-020 focus:border-red-030 text-red hover:text-red-020 focus:text-red-030",
  success: "",
  warning: "",
  info: ""
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-[2rem] text-sm font-[500] px-2",
  md: "h-[2.125rem] px-3",
  lg: ""
};
