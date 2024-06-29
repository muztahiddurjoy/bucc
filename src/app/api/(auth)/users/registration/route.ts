import dbConnect from "@/lib/dbConnect";
import PreregMemberInfo from "@/model/PreregMemberInfo";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, name, joinedBracu, departmentBracu, email } = body;

    await dbConnect();

    const member = await PreregMemberInfo.findOne({ email: email });

    if (member) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 },
      );
    }

    const newMember = new PreregMemberInfo({
      studentId,
      name,
      joinedBracu,
      departmentBracu,
      email,
    });

    await newMember.save();

    // Send the data to Google Sheets as well
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Preregs!A1:E1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[studentId, name, email, joinedBracu, departmentBracu]],
      },
    });

    return NextResponse.json(
      { message: "Registration Successful" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
