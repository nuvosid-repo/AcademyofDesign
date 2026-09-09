import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import WorkshopRegistration from "@/models/WorkshopRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name, email, phone, interest, country, designation, workshopId, workshopTitle,
    } = body;

    if (!name || !email || !phone || !interest || !country || !designation || !workshopId || !workshopTitle) {
      return NextResponse.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      );
    }

    const useMock = await resolveUseMock();

    if (useMock) {
      if (!globalThis.__mockRegistrations) globalThis.__mockRegistrations = [];
      const registration = {
        _id: "mock_" + Math.random().toString(36).slice(2, 11),
        name, email, phone, interest, country, designation, workshopId, workshopTitle,
        createdAt: new Date(),
      };
      globalThis.__mockRegistrations.push(registration);
      return NextResponse.json({
        success: true,
        message: "Mock registration processed successfully",
        data: registration,
      });
    }

    const registration = await WorkshopRegistration.create({
      name, email, phone, interest, country, designation, workshopId, workshopTitle,
    });
    return NextResponse.json({
      success: true,
      message: "Registration registered successfully",
      data: registration,
    });
  } catch (error) {
    console.error("Error in workshop registration:", error);
    return NextResponse.json(
      { error: error.message || "Server error occurred during registration" },
      { status: 500 }
    );
  }
}
