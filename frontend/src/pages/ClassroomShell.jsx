import { useParams } from "react-router-dom";

import Classroom from "@/pages/Classroom";
import ClassroomTeacherTools from "@/components/ClassroomTeacherTools";
import ClassroomHostQr from "@/components/ClassroomHostQr";
import ClassroomResultsReport from "@/components/ClassroomResultsReport";

export default function ClassroomShell() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();

  return (
    <>
      <Classroom />
      <ClassroomResultsReport roomCode={roomCode} />
      <ClassroomHostQr />
      <ClassroomTeacherTools />
    </>
  );
}
