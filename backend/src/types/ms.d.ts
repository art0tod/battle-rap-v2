declare module 'ms' {
  export interface Options {
    long?: boolean;
  }

  export type StringValue = `${number}${string}` | `${number}`;

  function ms(value: StringValue, options?: Options): number;
  function ms(value: number, options?: Options): string;

  export default ms;
}
