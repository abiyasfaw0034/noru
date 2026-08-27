import { Save } from "lucide-react";

import { SubmitButton } from "@/components/SubmitButton";
import { employeeStatuses, statusLabels } from "@/lib/constants";
import { toDateInputValue } from "@/lib/dates";

type Option = {
  id: string;
  name: string;
};

type EmployeeFormEmployee = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  hireDate: Date;
  departmentId: string | null;
  roleId: string | null;
};

type EmployeeFormProps = {
  action: (formData: FormData) => Promise<void>;
  departments: Option[];
  roles: Option[];
  employee?: EmployeeFormEmployee;
  submitLabel?: string;
};

export function EmployeeForm({
  action,
  departments,
  employee,
  roles,
  submitLabel = "Create employee",
}: EmployeeFormProps) {
  return (
    <form action={action} className="form-grid">
      <label>
        Employee code
        <input
          defaultValue={employee?.employeeCode}
          name="employeeCode"
          placeholder="NR-1006"
          required
        />
      </label>
      <label>
        First name
        <input defaultValue={employee?.firstName} name="firstName" required />
      </label>
      <label>
        Last name
        <input defaultValue={employee?.lastName} name="lastName" required />
      </label>
      <label>
        Email
        <input defaultValue={employee?.email} name="email" required type="email" />
      </label>
      <label>
        Phone
        <input defaultValue={employee?.phone ?? ""} name="phone" />
      </label>
      <label>
        Hire date
        <input
          defaultValue={employee ? toDateInputValue(employee.hireDate) : undefined}
          name="hireDate"
          required
          type="date"
        />
      </label>
      <label>
        Department
        <select defaultValue={employee?.departmentId ?? ""} name="departmentId">
          <option value="">Unassigned</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Role
        <select defaultValue={employee?.roleId ?? ""} name="roleId">
          <option value="">Unassigned</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select defaultValue={employee?.status ?? "ACTIVE"} name="status">
          {employeeStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <SubmitButton>
          <Save aria-hidden size={16} />
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
