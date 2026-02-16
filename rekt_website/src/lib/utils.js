import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export function absoluteUrl(path) {
  return `${process.env.REACT_APP_BASE_URL}${path}`;
}
