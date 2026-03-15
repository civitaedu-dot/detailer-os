import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const notifications: any[] = [];

    // Get user's notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Default all settings to true if no record
    const s = settings || {
      retention_15_days: true,
      retention_30_days: true,
      retention_45_days: true,
      birthdays: true,
      first_visit: true,
      loyalty_milestones: true,
      appointment_status: true,
      no_future_booking: true,
    };

    // Get all clients
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId);

    // Get all appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("appointment_date", { ascending: false });

    // Get existing notifications from today to avoid duplicates
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("category, client_id, type")
      .eq("user_id", userId)
      .gte("created_at", `${todayStr}T00:00:00`);

    const hasNotif = (category: string, clientId: string | null, type: string) => {
      return existingNotifs?.some(
        (n) => n.category === category && n.client_id === clientId && n.type === type
      );
    };

    if (clients && appointments) {
      for (const client of clients) {
        // Get client's completed appointments
        const clientAppts = appointments.filter(
          (a) => a.client_id === client.id && a.status === "completed"
        );
        const totalAppts = clientAppts.length;

        // --- RETENTION CHECKS ---
        if (totalAppts > 0) {
          const lastVisit = new Date(clientAppts[0].appointment_date);
          const daysSince = Math.floor(
            (today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
          );
          const lastVisitStr = lastVisit.toLocaleDateString("pt-BR");

          if (daysSince >= 45 && s.retention_45_days && !hasNotif("retention", client.id, "danger")) {
            notifications.push({
              user_id: userId,
              type: "danger",
              category: "retention",
              title: "Cliente perdido — ação urgente necessária",
              message: `${client.name} não retorna há ${daysSince} dias. Última visita: ${lastVisitStr}.`,
              client_id: client.id,
              client_name: client.name,
              metadata: { days_since: daysSince, last_visit: clientAppts[0].appointment_date },
            });
          } else if (daysSince >= 30 && daysSince < 45 && s.retention_30_days && !hasNotif("retention", client.id, "warning")) {
            notifications.push({
              user_id: userId,
              type: "warning",
              category: "retention",
              title: "Cliente inativo — considere entrar em contato",
              message: `${client.name} não retorna há ${daysSince} dias. Última visita: ${lastVisitStr}.`,
              client_id: client.id,
              client_name: client.name,
              metadata: { days_since: daysSince, last_visit: clientAppts[0].appointment_date },
            });
          } else if (daysSince >= 15 && daysSince < 30 && s.retention_15_days && !hasNotif("retention", client.id, "alert")) {
            notifications.push({
              user_id: userId,
              type: "alert",
              category: "retention",
              title: "Cliente em risco de inatividade",
              message: `${client.name} não retorna há ${daysSince} dias. Última visita: ${lastVisitStr}.`,
              client_id: client.id,
              client_name: client.name,
              metadata: { days_since: daysSince, last_visit: clientAppts[0].appointment_date },
            });
          }

          // --- FIRST VISIT ---
          if (totalAppts === 1 && s.first_visit) {
            const visitDate = new Date(clientAppts[0].appointment_date);
            const daysSinceFirst = Math.floor(
              (today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceFirst === 0 && !hasNotif("milestone", client.id, "success")) {
              notifications.push({
                user_id: userId,
                type: "success",
                category: "milestone",
                title: "Primeira visita completada!",
                message: `${client.name} completou sua primeira visita hoje.`,
                client_id: client.id,
                client_name: client.name,
              });
            }
          }

          // --- LOYALTY MILESTONES ---
          if (s.loyalty_milestones && [5, 10, 20].includes(totalAppts)) {
            if (!hasNotif("milestone", client.id, "info")) {
              notifications.push({
                user_id: userId,
                type: "info",
                category: "milestone",
                title: `Marco de fidelidade: ${totalAppts} atendimentos!`,
                message: `${client.name} atingiu ${totalAppts} atendimentos. Parabéns pela fidelização!`,
                client_id: client.id,
                client_name: client.name,
                metadata: { milestone: totalAppts },
              });
            }
          }

          // --- NO FUTURE BOOKING after 3+ visits ---
          if (s.no_future_booking && totalAppts >= 3) {
            const futureAppts = appointments.filter(
              (a) => a.client_id === client.id && a.status === "scheduled" && a.appointment_date >= todayStr
            );
            if (futureAppts.length === 0 && !hasNotif("retention", client.id, "info")) {
              notifications.push({
                user_id: userId,
                type: "info",
                category: "retention",
                title: "Cliente sem agendamento futuro",
                message: `${client.name} tem ${totalAppts} visitas mas nenhum agendamento futuro.`,
                client_id: client.id,
                client_name: client.name,
              });
            }
          }
        }

        // --- BIRTHDAY CHECKS ---
        if (s.birthdays && client.birthdate) {
          const birth = new Date(client.birthdate + "T12:00:00");
          const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
          const thisYearBdayStr = `${thisYearBday.getFullYear()}-${String(thisYearBday.getMonth() + 1).padStart(2, "0")}-${String(thisYearBday.getDate()).padStart(2, "0")}`;

          if (thisYearBdayStr === todayStr && !hasNotif("birthday", client.id, "celebration")) {
            notifications.push({
              user_id: userId,
              type: "celebration",
              category: "birthday",
              title: `🎂 Hoje é aniversário de ${client.name}!`,
              message: `Não esqueça de parabenizar ${client.name} pelo aniversário!`,
              client_id: client.id,
              client_name: client.name,
            });
          } else if (thisYearBdayStr === tomorrowDate && !hasNotif("birthday", client.id, "info")) {
            notifications.push({
              user_id: userId,
              type: "info",
              category: "birthday",
              title: `🎂 Amanhã é aniversário de ${client.name}`,
              message: `Prepare-se! Amanhã é aniversário de ${client.name}.`,
              client_id: client.id,
              client_name: client.name,
            });
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ generated: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
