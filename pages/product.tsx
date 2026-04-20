"use client"

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useAuth } from '@clerk/nextjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Protect, PricingTable, UserButton } from '@clerk/nextjs';

function CareerCoachForm() {
    const { getToken } = useAuth();
    const [output, setOutput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const [jobTitle, setJobTitle] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [resumeSummary, setResumeSummary] = useState('');
    const [yearsExperience, setYearsExperience] = useState('0');
    const [applicantEmail, setApplicantEmail] = useState('');
    const [targetRoleLevel, setTargetRoleLevel] = useState('junior');

    const handleSubmit = async () => {
        setLoading(true);
        setOutput('');
        let buffer = '';

        const jwt = await getToken();
        if (!jwt) {
            setOutput('Authentication required');
            setLoading(false);
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api`
            : '/api';

        await fetchEventSource(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                job_title: jobTitle,
                company_name: companyName,
                job_description: jobDescription,
                resume_summary: resumeSummary,
                years_experience: parseInt(yearsExperience),
                applicant_email: applicantEmail,
                target_role_level: targetRoleLevel,
            }),
            onmessage(ev) {
                buffer += ev.data.replace(/\\n/g, '\n');
                setOutput(buffer);
            },
            onerror(err) {
                console.error('SSE error:', err);
                setLoading(false);
                throw err;
            },
            onclose() {
                setLoading(false);
            },
        });
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    AI Career Coach
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Tailored resume bullets, cover letters & interview prep
                </p>
            </header>

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <div className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={e => setJobTitle(e.target.value)}
                                placeholder="e.g. Senior Software Engineer"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="e.g. Google"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Email</label>
                            <input
                                type="email"
                                value={applicantEmail}
                                onChange={e => setApplicantEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years of Experience</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={yearsExperience}
                                    onChange={e => setYearsExperience(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Role Level</label>
                                <select
                                    value={targetRoleLevel}
                                    onChange={e => setTargetRoleLevel(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="junior">Junior</option>
                                    <option value="mid">Mid</option>
                                    <option value="senior">Senior</option>
                                    <option value="executive">Executive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Description</label>
                            <textarea
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                placeholder="Paste the full job description here (min 50 characters)..."
                                rows={5}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resume Summary / Current Experience</label>
                            <textarea
                                value={resumeSummary}
                                onChange={e => setResumeSummary(e.target.value)}
                                placeholder="Summarise your experience, skills and achievements (min 50 characters)..."
                                rows={5}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                        >
                            {loading ? 'Generating...' : 'Generate Career Coaching'}
                        </button>
                    </div>
                </div>

                {output && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Your Career Coaching Report
                        </h2>
                        <div className="markdown-content text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {output}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Product() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="absolute top-4 right-4">
                <UserButton showName={true} />
            </div>
            <Protect
                plan="premium_subscription"
                fallback={
                    <div className="container mx-auto px-4 py-12">
                        <header className="text-center mb-12">
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                                Choose Your Plan
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                                Unlock unlimited AI-powered career coaching
                            </p>
                        </header>
                        <div className="max-w-4xl mx-auto">
                            <PricingTable />
                        </div>
                    </div>
                }
            >
                <CareerCoachForm />
            </Protect>
        </main>
    );
}
