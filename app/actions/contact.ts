"use server";

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
      from: process.env.CONTACT_FROM ?? "Portfolio <onboarding@resend.dev>",
      to: [process.env.CONTACT_TO ?? profile.email],
      reply_to: values.email,
      subject: `Portfolio message from ${values.name || values.email}`,
      text: `${values.message}\n\n— ${sender}`,
    }),
  }).catch((error: unknown) => {
    console.error("[contact] network error", error);
    return null;
  });

  if (!response?.ok) {
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
