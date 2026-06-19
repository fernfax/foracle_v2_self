import {
  loadCpf,
  loadIncomes,
  loadProperties
} from "@/lib/page-data/user-page-data"
import { CpfProjectionGraph } from "@/components/cpf/cpf-projection-graph"
import { CpfView } from "@/components/cpf/cpf-view"

export default async function CpfTab() {
  const [cpf, incomes, properties] = await Promise.all([
    loadCpf(),
    loadIncomes(),
    loadProperties()
  ])

  return (
    <>
      <CpfView cpfData={cpf} incomes={incomes} />
      <div className="mt-6">
        <CpfProjectionGraph
          cpfData={cpf}
          incomes={incomes}
          propertyAssets={properties}
        />
      </div>
    </>
  )
}
