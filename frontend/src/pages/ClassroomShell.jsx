import Classroom from "@/pages/Classroom";
import ClassroomTeacherTools from "@/components/ClassroomTeacherTools";
import ClassroomHostQr from "@/components/ClassroomHostQr";

export default function ClassroomShell() {
  return (
    <>
      <Classroom />
      <ClassroomHostQr />
      <ClassroomTeacherTools />
    </>
  );
}
