"use client";

import { useActionState, useState } from "react";
import { submitRegistration, type RegistrationFormState } from "./actions";
import { Button, Card, CardHeader, Input, Select, Textarea } from "@/components/ui/primitives";
import { SignaturePad } from "@/components/signature-pad";
import { WAIVER_TEXT } from "@/lib/waiver";
import { formatMoney } from "@/lib/business";

type Plan = {
  id: number;
  name: string;
  type: string;
  price: string;
  billingIntervalMonths: number;
  description: string | null;
};

const initialState: RegistrationFormState = {};

export function RegistrationForm({ plans }: { plans: Plan[] }) {
  const [state, formAction, pending] = useActionState(submitRegistration, initialState);
  const [selectedPlan, setSelectedPlan] = useState<Plan | undefined>(plans[0]);
  const [amount, setAmount] = useState(plans[0]?.price ?? "0");

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
          {state.error}
        </p>
      )}

      <Card>
        <CardHeader title="Your details" subtitle="Tell us a bit about yourself" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="First name" name="firstName" required hint={err("firstName")} />
          <Input label="Last name" name="lastName" required hint={err("lastName")} />
          <Input label="Email" name="email" type="email" required hint={err("email")} />
          <Input label="Phone" name="phone" type="tel" required hint={err("phone")} />
          <Input label="Date of birth" name="dob" type="date" />
          <Select label="Gender" name="gender" defaultValue="">
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Other</option>
          </Select>
          <div className="sm:col-span-2">
            <Textarea label="Address" name="address" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Photo (optional)" name="photo" type="file" accept="image/*" />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Emergency contact" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Full name" name="emergencyContactName" required hint={err("emergencyContactName")} />
          <Input label="Phone" name="emergencyContactPhone" type="tel" required hint={err("emergencyContactPhone")} />
          <Input label="Relationship" name="emergencyContactRelation" placeholder="e.g. Spouse, Parent" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Choose your plan" subtitle={err("planId")} />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--dg-line)] p-4 has-[:checked]:border-[var(--dg-accent)] has-[:checked]:bg-[var(--dg-accent)]/5"
            >
              <input
                type="radio"
                name="planId"
                value={plan.id}
                defaultChecked={plan.id === plans[0]?.id}
                className="mt-1"
                onChange={() => {
                  setSelectedPlan(plan);
                  setAmount(plan.price);
                }}
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--dg-ink)]">{plan.name}</span>
                <span className="block text-xs text-[var(--dg-slate)]">{plan.type.replace("_", " ")}</span>
                <span className="mt-1 block text-sm font-semibold text-[var(--dg-accent)]">
                  {formatMoney(plan.price)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Documents" subtitle="ID proof required; medical clearance if applicable" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="ID proof" name="idProof" type="file" accept="image/*,application/pdf" />
          <Input label="Medical clearance (optional)" name="medicalClearance" type="file" accept="image/*,application/pdf" />
        </div>
      </Card>

      <Card>
        <CardHeader title="How did you hear about us?" />
        <div className="p-5">
          <Select name="referralSource" defaultValue="ONLINE">
            <option value="WALK_IN">Walk-in</option>
            <option value="ONLINE">Online</option>
            <option value="REFERRAL">Referral from a friend</option>
            <option value="SOCIAL_MEDIA">Social media</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader title="Payment" subtitle="Recorded manually — no online payment is taken here" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Payment method" name="paymentMethod" defaultValue="CASH">
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input
            label="Amount"
            name="paymentAmount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input label="Reference / notes (optional)" name="paymentReference" placeholder="Receipt no., cheque no., etc." />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Waiver & e-signature" />
        <div className="space-y-4 p-5">
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--dg-line)] bg-gray-50 p-3 text-xs text-[var(--dg-slate)]">
            {WAIVER_TEXT}
          </pre>
          <label className="flex items-start gap-2 text-sm text-[var(--dg-ink)]">
            <input type="checkbox" name="agreeWaiver" required className="mt-1" />
            I have read and agree to the waiver and terms above.
          </label>
          {err("agreeWaiver") && <p className="text-xs text-red-600">{err("agreeWaiver")}</p>}
          <Input label="Type your full name to sign" name="signedName" required hint={err("signedName")} />
          <SignaturePad name="signatureDataUrl" />
        </div>
      </Card>

      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
