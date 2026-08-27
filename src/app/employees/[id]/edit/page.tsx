import { notFound } from "next/navigation";

import { updateEmployee } from "@/app/actions";
import { EmployeeForm } from "@/components/EmployeeForm";
import { NoHotelState } from "@/components/NoHotelState";
import { prisma } from "@/lib/db";
import { getHotelContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type EditEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { activeHotel } = await getHotelContext();

  if (!activeHotel) {
    return <NoHotelState />;
  }

  const { id } = await params;

  const [employee, departments, roles] = await Promise.all([
    prisma.employee.findUnique({
      where: {
        id,
        hotelId: activeHotel.id,
      },
    }),
    prisma.department.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.role.findMany({
      where: {
        hotelId: activeHotel.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Edit employee</h1>
          <p className="page-kicker">
            Update profile details, employment status, department, or role assignment.
          </p>
        </div>
      </header>

      <section className="panel">
        <EmployeeForm
          action={updateEmployee.bind(null, employee.id)}
          departments={departments}
          employee={employee}
          roles={roles}
          submitLabel="Save changes"
        />
      </section>
    </>
  );
}
