import db from "../database";
import { schedules as scheduleTable } from "../database/schema";
import { CronJob } from "cron";
import { MessageMedia } from "whatsapp-web.js";
import client from "../bot";
import axios from "axios";

async function scheduleBotWa() {
    const contacts = '120363399035819974@g.us'

    function getRandomMessage(doer: number, sinner: number, total: number) {

        const message = [
            `
\`name FROM members WHERE tugas_css = 'pending';\`

Hasilnya: Ada {sinner} nama yang muncul di terminal saya! 👻

Ayo, para pejuang Mura Computer Club, segera selesaikan tugas "CSS: Flexbox, Grid & Responsivitas".

{doer} member lain udah berhasil nge-deploy tugas mereka. Jangan sampai tugasmu malah jadi deprecated ya, hehe. Ditunggu segera! 💻
            `,
            `
 Hey, para coders MCC! 📢

Query terbaru menunjukkan ada {sinner} anggota yang datanya belum masuk untuk tugas "CSS: Flexbox, Grid & Responsivitas".

Sementara itu, {doer} anggota lainnya sudah berhasil commit & push. Jangan sampai kamu kena Error 404: Tugas Not Found ya. Yuk, segera kumpulin! 😄
            `,
            `
Hello, coders MCC! 👋

Sekadar mengingatkan kembali untuk tugas kita, "CSS: Flexbox, Grid & Responsivitas".vs

Saat ini sudah ada {doer} teman kita yang menyelesaikan, mantap! 💪 Buat {sinner} orang lagi yang belum, kami tunggu karyanya ya. Semangat!

Ingat, kalau ada bug atau kendala, jangan sungkan buat diskusi bareng di grup! 😉
            `
        ]

        return message[Math.floor(Math.random() * message.length)].replace("{doer}", String(doer)).replace("{sinner}", String(sinner)).replace("{total}", String(total))
    }


    if (!client.isLoggedIn) return

    try {
        const res = await axios.get("https:backend.study-mcc.my.id/api/reminder-to-submit/4/2")

        await client.sendMessage(contacts, getRandomMessage(res.data.data.doer_count, res.data.data.sinner_count, res.data.data.total_users))

    } catch (error) {
        console.error(error);
    }
}


const customJob = new CronJob("0 30 18 * * *", scheduleBotWa)


let activeSchedules: CronJob[] = [];

async function loadAndStartSchedules() {
    const scheduleData = await db.select().from(scheduleTable);
    console.log(`[Scheduler] Starting with ${scheduleData.length} tasks`);
    await scheduleBotWa()
    const newSchedules: CronJob[] = [];

    customJob.start()
    newSchedules.push()

    for (const schedule of scheduleData) {

        // const dateCron = parseCronTime(schedule.scheduled_time);

        // if (dateCron.month >= now.getMonth() + 1)
        //     continue;

        try {
            const job = new CronJob(schedule.scheduled_time, async () => {

                if (client.isLoggedIn) {
                    for (const target of JSON.parse(schedule.contact_ids)) {
                        try {

                            const media = schedule.attachment ? MessageMedia.fromFilePath(schedule.attachment) : undefined;

                            await client.sendMessage(target, media ? media : schedule.message, media && { caption: schedule.message })

                        } catch (error) {
                            console.error(`[Scheduler] Failed to send message to ${target}:`, error);

                        }
                    }
                }

            }, null, false, 'Asia/Jakarta')

            job.start();
            newSchedules.push(job);
        } catch (error: any) {
            console.error("Schedule error =>", error.message);

        }
    }

    activeSchedules = newSchedules;
}


const dailyRefreshJob = new CronJob("0 0 0 * * *", async () => {
    console.log("[Scheduler] Refreshing schedules...");

    stopAllSchedules();
    await loadAndStartSchedules();
});

export default async function initializeSchedules() {
    await loadAndStartSchedules();
    dailyRefreshJob.start();
}

function stopAllSchedules() {
    for (const job of activeSchedules) {
        job.stop();
    }
}

export async function activeSchduleCurrent(data: {
    message: string,
    contact_ids: string[],
    scheduled_time: string,
    attachment?: string | null | undefined
}) {
    try {

        console.log("activing new schedule");

        const job = new CronJob(data.scheduled_time, async () => {
            if (client.isLoggedIn) {
                for (const target of data.contact_ids) {
                    try {

                        const media = data.attachment ? MessageMedia.fromFilePath(data.attachment) : undefined;

                        await client.sendMessage(target, media ? media : data.message, media && { caption: data.message })
                    } catch (error) {
                        console.error(`[Scheduler] Failed to send message to ${target}:`, error);

                    }
                }
            }
        }, null, false, 'Asia/Jakarta')

        job.start()

        activeSchedules.push(job)

    } catch (error: any) {
        console.error("Schedule error =>", error.message);

    }
}
