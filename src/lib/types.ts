export type Role = "client" | "staff" | "owner";
export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  marketing: number;
  preferred_professional: string | null;
};
export type AppointmentStatus =
  "confirmed" | "completed" | "cancelled" | "no_show";
export type Appointment = {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  busy_until: string;
  price: number;
  status: AppointmentStatus;
  addons: string;
  client_name: string;
  created_at: string;
};
export type Slot = {
  start: string;
  end: string;
  professionalId: string;
  price: number;
  duration: number;
};
export type Block = {
  id: string;
  professional_id: string;
  start_at: string;
  end_at: string;
  reason: string;
};
export interface PaymentProvider {
  createDeposit(input: {
    appointmentId: string;
    amount: number;
    currency: string;
  }): Promise<{ url: string }>;
  refund(paymentId: string, amount: number): Promise<void>;
}
export interface NotificationProvider {
  send(input: {
    recipient: string;
    template:
      "confirmation" | "reminder" | "cancellation" | "reschedule" | "rebook";
    variables: Record<string, string>;
  }): Promise<{ providerId: string }>;
}
export const payments: PaymentProvider = {
  async createDeposit() {
    throw new Error("Payments are not connected. No charge has been made.");
  },
  async refund() {
    throw new Error("Payments are not connected.");
  },
};
