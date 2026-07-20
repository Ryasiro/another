import { NextRequest, NextResponse } from 'next/server';
import { gemini, PRECISE_MODEL } from '@/lib/gemini';
import { SchemaType } from '@google/generative-ai';
import { CLARIFICATION_SYSTEM_PROMPT, getClarificationUserPrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea } = body;

    if (!idea || typeof idea !== 'string' || !idea.trim()) {
      return NextResponse.json(
        { error: 'Ide aplikasi (idea) wajib diisi' },
        { status: 400 }
      );
    }

    const model = gemini.getGenerativeModel({
      model: PRECISE_MODEL,
      systemInstruction: CLARIFICATION_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            suggestedName: {
              type: SchemaType.STRING,
              description: 'Nama sementara aplikasi yang cocok dengan ide user'
            },
            questions: {
              type: SchemaType.ARRAY,
              description: 'Daftar pertanyaan klarifikasi maksimal 5 buah',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING, description: 'ID unik seperti q1, q2, dst' },
                  question: { type: SchemaType.STRING, description: 'Pertanyaan klarifikasi dalam Bahasa Indonesia' },
                  helper: { type: SchemaType.STRING, description: 'Contoh jawaban atau teks bantuan singkat' }
                },
                required: ['id', 'question']
              }
            }
          },
          required: ['suggestedName', 'questions']
        }
      }
    });

    const result = await model.generateContent(getClarificationUserPrompt(idea));
    const jsonText = result.response.text();

    if (!jsonText) {
      throw new Error('Gemini failed to return a valid JSON response');
    }

    const parsed = JSON.parse(jsonText);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error generating clarifications with Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses ide awal' },
      { status: 500 }
    );
  }
}
