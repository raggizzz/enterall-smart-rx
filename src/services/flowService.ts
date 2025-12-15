// Stubbed flowService (removed per user request)
export const saveFlowRun = async (_payload: any) => {
  // Keep same return shape as original mock to avoid breaking callers
  await new Promise((r) => setTimeout(r, 100));
  return { data: { id: 'mock-flow-stub' }, error: null };
};
