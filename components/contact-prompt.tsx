"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "reicon-react";

import { profile } from "@/lib/content";
import { dots } from "@/lib/dots/runtime";

export function ContactPrompt() {
  const [note, setNote] = useState("");
  const sendRef = useRef<HTMLButtonElement>(null);

  return (
    <form
      className="prompt"
      data-dots="outline"
      data-dots-spread="1.9"
      data-dots-weight="1.3"
      onSubmit={(e) => {
        e.preventDefault();
        const r = sendRef.current?.getBoundingClientRect();
        if (r) dots.burst(r.left + r.width / 2, r.top + r.height / 2, 1.2);
        const subject = encodeURIComponent("Hello from your portfolio");
        const body = encodeURIComponent(note);
        window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      }}
    >
      <label className="sr-only" htmlFor="note">
        Message for {profile.name}
      </label>
      <input
        id="note"
        name="note"
        className="prompt__input"
        placeholder={`Write a note to ${profile.name.split(" ")[0]}…`}
        autoComplete="off"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <span className="prompt__chip hide-compact" aria-hidden>
        mailto
      </span>
      <button
        ref={sendRef}
        type="submit"
        className="prompt__send"
        aria-label="Open in your mail app"
        data-dots="ring"
        data-dots-spread="2.6"
        data-dots-weight="2.4"
      >
        <ArrowUp size={16} aria-hidden />
      </button>
    </form>
  );
}
