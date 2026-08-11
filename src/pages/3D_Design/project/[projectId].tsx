import { useRouter } from "next/router";
import CadWorkspace from "@/components/cad/workspace/CadWorkspace";

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const projectId =
    typeof router.query.projectId === "string" ? router.query.projectId : undefined;

  return <CadWorkspace projectId={projectId} />;
}

