import { Mail } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { getTeammatesForUser } from "@/lib/db/queries"

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  developer: "Developer",
  stakeholder: "Stakeholder",
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export default async function TeamPage() {
  const user = await requireUser()
  const teammates = await getTeammatesForUser(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">Team</h1>
        <p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2">
          Everyone you share a project with
        </p>
      </div>

      {teammates.length === 0 ? (
        <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 p-8 text-center">
          <p className="text-paynes_gray-500 dark:text-french_gray-400">
            No teammates yet. Open a project and use its{" "}
            <span className="font-medium">Members</span> button to add someone.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teammates.map((mate) => (
            <div
              key={mate.id}
              className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue_munsell-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {initials(mate.name)}
                </div>
                <div>
                  <h3 className="font-semibold text-outer_space-500 dark:text-platinum-500">
                    {mate.name}
                  </h3>
                  <p className="text-sm text-paynes_gray-500 dark:text-french_gray-400">
                    {mate.projects.length} project{mate.projects.length === 1 ? "" : "s"} together
                  </p>
                </div>
              </div>

              <div className="flex items-center text-sm text-paynes_gray-500 dark:text-french_gray-400 mb-4">
                <Mail size={16} className="mr-2" />
                {mate.email}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {mate.projects.map((p) => (
                  <span
                    key={p.projectId}
                    title={p.projectName}
                    className="px-2 py-1 text-xs font-medium rounded-full bg-lavender-100 text-lavender-700 dark:bg-paynes_gray-400 dark:text-platinum-500"
                  >
                    {p.projectName} · {ROLE_LABELS[p.role] ?? p.role}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}