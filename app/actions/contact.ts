"use server";

import { headers } from "next/headers";
import { profile } from "@/lib/content";

export type ContactState = {
  status: "idle" | "sent" | "error";
  message: string;
  /** Echoed back on error so the visitor never loses what they wrote. */
  values?: { name: string; email: string; message: string };
  /** Changes on every submit so the client can react to repeat results. */
  at: number;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends allowed per visitor and per server instance in a 10-minute window,
 * so a script can't spend the Resend quota or flood the inbox. It lives in
 * memory, so it's best effort across instances, but each one holds its limit.
 */
const WINDOW_MS = 10 * 60 * 1000;
const PER_VISITOR = 3;
const PER_INSTANCE = 30;
const recent = new Map<string, number[]>();
let recentAll: number[] = [];

/**
 * Takes a slot for one send, or returns null when the visitor or the instance
 * is over the limit. Calling the returned function gives the slot back.
 */
function reserveSend(visitor: string | null, now: number) {
  const fresh = (times: number[]) => times.filter((t) => now - t < WINDOW_MS);
  recentAll = fresh(recentAll);
  if (recent.size > 1000) {
    for (const [key, times] of recent) {
      const kept = fresh(times);
      if (kept.length) recent.set(key, kept);
      else recent.delete(key);
    }
  }
  // Without an address there's no visitor to count, so only the cap applies.
  const mine = visitor ? fresh(recent.get(visitor) ?? []) : [];
  if (mine.length >= PER_VISITOR || recentAll.length >= PER_INSTANCE) {
    return null;
  }
  mine.push(now);
  if (visitor) recent.set(visitor, mine);
  recentAll.push(now);
  return () => {
    const drop = (times: number[] | undefined) => {
      const k = times?.indexOf(now) ?? -1;
      if (k >= 0) times?.splice(k, 1);
    };
    drop(recentAll);
    if (visitor) drop(recent.get(visitor));
  };
}

const field = (data: FormData, key: string, max: number) =>
  String(data.get(key) ?? "")
    .trim()
    .slice(0, max);

/**
 * Delivers a contact-form message to the site owner's inbox through Resend.
 * The visitor's address is set as Reply-To, so replying goes straight to them.
 */
export async function sendContact(
  _prev: ContactState,
  data: FormData,
): Promise<ContactState> {
  const values = {
    name: field(data, "name", 100),
    email: field(data, "email", 200),
    message: field(data, "message", 5000),
  };
  const at = Date.now();

  // Honeypot: real visitors never see this field. Pretend success for bots.
  if (field(data, "website", 200)) {
    return {
      status: "sent",
      message: "Thanks — your message is on its way.",
      at,
    };
  }
  if (!EMAIL.test(values.email)) {
    return {
      status: "error",
      message: "Please add an email I can reply to.",
      values,
      at,
    };
  }
  if (values.message.length < 2) {
    return {
      status: "error",
      message: "Please write a message first.",
      values,
      at,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    return {
      status: "error",
      message: `Sending isn’t set up yet — please email ${profile.email} directly.`,
      values,
      at,
    };
  }

  // The nearest proxy appends the address it saw to X-Forwarded-For, so the
  // last entry is the one a visitor can't write themselves.
  const requestHeaders = await headers();
  const visitor =
    requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    null;
  const release = reserveSend(visitor, at);
  if (!release) {
    return {
      status: "error",
      message: `That’s a lot of messages in a few minutes — please try again later or email ${profile.email}.`,
      values,
      at,
    };
  }

  const sender = values.name
    ? `${values.name} <${values.email}>`
    : values.email;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || "Portfolio <onboarding@resend.dev>",
      to: [process.env.CONTACT_TO || profile.email],
      reply_to: values.email,
      subject: `Portfolio message from ${values.name || values.email}`,
      text: `${values.message}\n\n— ${sender}`,
    }),
  }).catch((error: unknown) => {
    console.error("[contact] network error", error);
    return null;
  });

  if (!response?.ok) {
    // Nothing was delivered, so a retry shouldn't count against the visitor.
    release();
    if (response)
      console.error(
        "[contact] Resend rejected",
        response.status,
        await response.text(),
      );
    return {
      status: "error",
      message: `Something went wrong while sending — please email ${profile.email}.`,
      values,
      at,
    };
  }

  return {
    status: "sent",
    message: `Sent — I’ll reply to ${values.email} soon.`,
    at,
  };
}
