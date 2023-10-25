import { KwilAction } from "../database/KwilAction"

export type Actions = Record<string, KwilAction>;
  
export type Store<T extends Actions> = Readonly<{
  [k in keyof T]: KwilAction;
}>;

