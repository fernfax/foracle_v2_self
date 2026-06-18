import { BudgetAddFab } from "@/components/budget"

// Budget-scoped layout. The add-expense FAB is mounted here (not buried in the
// page client) so it sits alongside the app-level help/add buttons in one
// coherent structure. It portals into the shared FAB stack host in the
// dashboard shell, so it stacks above the help button on every screen size.
export default function BudgetLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <BudgetAddFab />
    </>
  )
}
