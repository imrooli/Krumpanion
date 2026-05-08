export function memoizeLast<TArgs extends readonly unknown[], TResult>(
  compute: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  let previousArgs: TArgs | undefined;
  let previousResult: TResult | undefined;

  return (...args: TArgs) => {
    if (
      previousArgs &&
      previousArgs.length === args.length &&
      previousArgs.every((value, index) => Object.is(value, args[index]))
    ) {
      return previousResult as TResult;
    }

    previousArgs = args;
    previousResult = compute(...args);
    return previousResult;
  };
}
