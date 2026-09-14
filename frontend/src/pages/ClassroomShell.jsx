import { useParams } from "react-router-dom";

import Classroom from "@/pages/Classroom";
import ClassroomTeacherTools from "@/components/ClassroomTeacherTools";
import ClassroomHostQr from "@/components/ClassroomHostQr";
import ClassroomResultsReport from "@/components/ClassroomResultsReport";
import ClassroomEndgame from "@/components/ClassroomEndgame";
import ClassroomProjectorButton from "@/components/ClassroomProjectorButton";
import ClassroomFocusGuard from "@/components/ClassroomFocusGuard";

export default function ClassroomShell() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();

  return (
    <div className="classroom-shell">
      <ClassroomFocusGuard />
      <ClassroomProjectorButton />
      <ClassroomEndgame />
      <Classroom />
      <ClassroomResultsReport roomCode={roomCode} />
      <ClassroomHostQr />
      <ClassroomTeacherTools />
    </div>
  );
}
