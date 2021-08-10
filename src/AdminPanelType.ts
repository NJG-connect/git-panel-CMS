export interface noneType {
  type: "none";
  title: string;
  file: string;
  fields: Array<inputType | objectType | arrayType>;
  urlPage?: string;
}

export interface inputType {
  type: "input";
  title: string;
  value?: any;
  disabled?: boolean;
  id: string;
  htmlId?: string;
}

export interface objectType {
  type: "object";
  title: string;
  id: string;
  fields: Array<noneType | inputType | objectType | arrayType>;
}
export interface arrayType {
  type: "array";
  title: string;
  id: string;
  fields: Array<inputType>;
  referenceFieldKey: string;
  canAdd?: boolean;
  canDelete?: boolean;
  canReoder?: boolean;
  value?: string;
}

export interface CmsPropsType {
  type: "firstLvl";
  branch: string;
  repo: string;
  title: string;
  urlForLogin: string;
  fields: Array<noneType | inputType | objectType | arrayType>;
}

export default CmsPropsType;
