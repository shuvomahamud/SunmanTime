"use client";

import { useRef } from "react";
import { MailPlus, X } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { inviteEmployee } from "./actions";

export function EmployeeInviteModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className="button-primary link-button"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <MailPlus size={17} />
        Invite employee
      </button>

      <dialog className="invite-dialog" ref={dialogRef}>
        <div className="invite-dialog-header">
          <div>
            <p className="eyebrow">Invite-only registration</p>
            <h2>Invite an employee</h2>
          </div>
          <button
            className="dialog-close"
            type="button"
            aria-label="Close invitation form"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>

        <form action={inviteEmployee} className="form-stack employee-form">
          <div className="form-grid">
            <label>
              <span>First name</span>
              <input name="firstName" autoComplete="off" required />
            </label>
            <label>
              <span>Last name</span>
              <input name="lastName" autoComplete="off" required />
            </label>
          </div>
          <label>
            <span>Username</span>
            <input
              name="username"
              minLength={2}
              pattern="[a-zA-Z0-9._-]+"
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Work email</span>
            <input name="email" type="email" autoComplete="off" required />
          </label>
          <div className="invite-dialog-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <SubmitButton
              className="button-primary"
              pendingLabel="Sending invitation…"
            >
              <MailPlus size={17} />
              Send invitation
            </SubmitButton>
          </div>
          <p className="form-help">
            The employee receives a one-time link to choose their password.
          </p>
        </form>
      </dialog>
    </>
  );
}
