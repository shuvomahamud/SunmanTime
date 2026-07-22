"use client";

import { useRef } from "react";
import { MailPlus, ShieldCheck, UserPlus, X } from "lucide-react";
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

      <dialog
        className="invite-dialog"
        ref={dialogRef}
        aria-labelledby="invite-dialog-title"
        aria-describedby="invite-dialog-description"
      >
        <div className="invite-dialog-header">
          <span className="invite-dialog-icon" aria-hidden="true">
            <UserPlus size={23} />
          </span>
          <div className="invite-dialog-heading">
            <p className="eyebrow">Team access</p>
            <h2 id="invite-dialog-title">Invite an employee</h2>
            <p id="invite-dialog-description">
              Create their account and send a secure link to get started.
            </p>
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

        <form action={inviteEmployee} className="form-stack employee-form invite-form">
          <div className="form-grid">
            <label>
              <span>First name</span>
              <input
                name="firstName"
                placeholder="Jane"
                autoComplete="off"
                required
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                name="lastName"
                placeholder="Doe"
                autoComplete="off"
                required
              />
            </label>
          </div>
          <label>
            <span>Username</span>
            <input
              name="username"
              placeholder="jane.doe"
              minLength={2}
              pattern="[a-zA-Z0-9._-]+"
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Work email</span>
            <input
              name="email"
              type="email"
              placeholder="jane@company.com"
              autoComplete="off"
              required
            />
          </label>
          <div className="invite-dialog-footer">
            <p className="invite-assurance">
              <ShieldCheck size={17} aria-hidden="true" />
              No temporary password is shared.
            </p>
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
          </div>
        </form>
      </dialog>
    </>
  );
}
