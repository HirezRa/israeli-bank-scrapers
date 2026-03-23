export function assertNever(_never: never, error = ''): never {
  throw new Error(error || 'Unexpected internal branch');
}
