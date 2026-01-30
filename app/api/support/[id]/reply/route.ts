import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { sendSupportReply } from '@/lib/email/brevo';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'support.reply');
  if (result instanceof NextResponse) return result;
  const { id } = await params;

  try {
    const { message, sendEmail = true } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Get the support ticket
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
    }

    // Create the ticket response
    const ticketResponse = await prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        message: message.trim(),
        isStaff: true,
        responderId: result.session.adminId,
      },
    });

    // Send email notification if requested
    let emailSent = false;
    if (sendEmail && ticket.email) {
      const emailResult = await sendSupportReply(
        ticket.email,
        ticket.ticketNumber,
        ticket.subject,
        message.trim()
      );
      emailSent = emailResult.success;
    }

    // Update ticket status to IN_PROGRESS if currently OPEN
    if (ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Log admin action
    await logAdminAction(
      result.session.adminId,
      'support.reply',
      'support_ticket',
      id,
      { message: message.trim(), emailSent },
      request
    );

    return NextResponse.json({
      success: true,
      data: ticketResponse,
      emailSent,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
