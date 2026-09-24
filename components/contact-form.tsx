"use client";

import { type KeyboardEvent, useActionState, useEffect, useRef } from "react";
import { ArrowUp } from "reicon-react";

import { type ContactState, sendContact } from "@/app/actions/contact";
import { dots } from "@/lib/dots/runtime";

const initial: ContactState = { status: "idle", message: "", at: 0 };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);

  // Celebrate a delivered message with a shockwave from the send button.
  useEffect(() => {
    if (state.status !== "sent") return;
    const r = sendRef.current?.getBoundingClientRect();
    if (r) dots.burst(r.left + r.width / 2, r.top + r.height / 2, 1.6);
  }, [state]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a line. Never interrupt IME composition.
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!pending) formRef.current?.requestSubmit();
  };

  const values = state.status === "error" ? state.values : undefined;

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className="letter"
        aria-busy={pending}
        data-dots="outline"
        data-dots-spread="1.7"
        data-dots-weight="1.2"
      >
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className="letter__message"
          placeholder="Write your message…"
          rows={6}
          maxLength={5000}
          required
          defaultValue={values?.message}
          onKeyDown={onKeyDown}
        />
        <div className="letter__rule" data-dots="rule" data-dots-spread="0.6" />
        <div className="letter__row">
          <label className="sr-only" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            name="name"
            className="letter__field"
            placeholder="Your name"
            autoComplete="name"
            maxLength={100}
            defaultValue={values?.name}
          />
          <label className="sr-only" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="letter__field"
            placeholder="Your email"
            autoComplete="email"
            maxLength={200}
            required
            defaultValue={values?.email}
          />
          {/* Honeypot for bots; hidden from people and assistive tech. */}
          <input
            name="website"
            className="letter__trap"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />
          <button
            ref={sendRef}
            type="submit"
            className="letter__send"
            aria-label="Send message"
            disabled={pending}
            data-dots="ring"
            data-dots-spread="2.4"
            data-dots-weight="2.2"
          >
            <ArrowUp size={16} aria-hidden />
          </button>
        </div>
      </form>
      <output className="contact__status" data-status={state.status}>
        {pending ? "Sending…" : state.message}
      </output>
    </>
  );
}
