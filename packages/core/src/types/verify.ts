interface VerifyInfo {
  address: string;
  compilerVersion: string;
  sourceCode: string;
  name: string;
  args: string;
}

export type VerifyResult = VerifyInfo[];
