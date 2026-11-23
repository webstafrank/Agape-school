/**
 * Visible flag on pages whose copy is still placeholder text.
 * Rendered when the page's content has `draft: true`; remove by
 * confirming the copy and setting `draft: false`.
 */
export function DraftNotice() {
  return (
    <div role="note" className="border-b border-accent-300 bg-accent-100">
      <p className="mx-auto max-w-content px-4 py-3 text-sm text-accent-900 sm:px-6">
        <strong className="font-bold">Draft:</strong> this page uses placeholder text that the school
        will confirm or replace.
      </p>
    </div>
  );
}
