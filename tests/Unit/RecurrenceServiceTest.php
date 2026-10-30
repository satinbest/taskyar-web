<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Models\User;
use App\Services\JalaliCalendar;
use App\Services\RecurrenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurrenceServiceTest extends TestCase
{
    use RefreshDatabase;

    private RecurrenceService $service;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RecurrenceService;
        $this->user = User::factory()->create();
    }

    public function test_jalali_calendar_borkowski_conversion(): void
    {
        // 2026-03-21 -> 1405/01/01
        $j = JalaliCalendar::gregorianToJalali(2026, 3, 21);
        $this->assertEquals(1405, $j['jy']);
        $this->assertEquals(1, $j['jm']);
        $this->assertEquals(1, $j['jd']);

        // 1405/01/01 -> 2026-03-21
        $g = JalaliCalendar::jalaliToGregorian(1405, 1, 1);
        $this->assertEquals(2026, $g['gy']);
        $this->assertEquals(3, $g['gm']);
        $this->assertEquals(21, $g['gd']);

        // Leap years
        $this->assertTrue(JalaliCalendar::isLeapJalali(1403));
        $this->assertFalse(JalaliCalendar::isLeapJalali(1404));
        $this->assertEquals(30, JalaliCalendar::jalaliMonthLength(1403, 12));
        $this->assertEquals(29, JalaliCalendar::jalaliMonthLength(1404, 12));
    }

    public function test_daily_recurrence_expansion(): void
    {
        $task = Task::create([
            'user_id' => $this->user->id,
            'title' => 'Daily Task',
            'due_date' => '2026-10-01',
            'recurrence_pattern' => 'daily',
            'recurrence_interval' => 1,
        ]);

        $occurrences = $this->service->expandOccurrences($task, '2026-10-01', '2026-10-05');
        $this->assertCount(5, $occurrences);
        $this->assertEquals('2026-10-01', $occurrences[0]['dueDate']);
        $this->assertEquals('2026-10-05', $occurrences[4]['dueDate']);
    }

    public function test_weekly_recurrence_on_persian_weekdays(): void
    {
        // Saturday (0) and Monday (2)
        // 2026-10-24 is Saturday (0), 2026-10-26 is Monday (2)
        $task = Task::create([
            'user_id' => $this->user->id,
            'title' => 'Class Task',
            'due_date' => '2026-10-24',
            'recurrence_pattern' => 'weekly',
            'recurrence_weekdays' => [0, 2], // Sat, Mon
        ]);

        $occurrences = $this->service->expandOccurrences($task, '2026-10-24', '2026-10-31');
        // Should produce: 2026-10-24 (Sat), 2026-10-26 (Mon), 2026-10-31 (Sat)
        $dates = array_column($occurrences, 'dueDate');
        $this->assertContains('2026-10-24', $dates);
        $this->assertContains('2026-10-26', $dates);
        $this->assertContains('2026-10-31', $dates);
    }

    public function test_monthly_recurrence_with_jalali_clamping(): void
    {
        // 1405/06/31 is Shahrivar 31 (2026-09-22)
        // Next month is Mehr (month 7, which only has 30 days)
        // It should clamp to Mehr 30 (1405/07/30 -> 2026-10-22)
        $task = Task::create([
            'user_id' => $this->user->id,
            'title' => 'End of Month Goal',
            'due_date' => '2026-09-22',
            'recurrence_pattern' => 'monthly',
            'recurrence_month_day' => 31,
            'recurrence_interval' => 1,
        ]);

        $occurrences = $this->service->expandOccurrences($task, '2026-09-01', '2026-11-30');
        $dates = array_column($occurrences, 'dueDate');

        $this->assertContains('2026-09-22', $dates);
        // Mehr 30 clamp: 1405/07/30 = 2026-10-22
        $this->assertContains('2026-10-22', $dates);
    }

    public function test_occurrence_completion_and_skipping(): void
    {
        $task = Task::create([
            'user_id' => $this->user->id,
            'title' => 'Recurring Task',
            'due_date' => '2026-10-01',
            'recurrence_pattern' => 'daily',
            'recurrence_interval' => 1,
        ]);

        // Complete occurrence on 2026-10-02
        $this->service->completeOccurrence($task, '2026-10-02', $this->user->id);

        // Skip occurrence on 2026-10-03
        $this->service->skipOccurrence($task, '2026-10-03', $this->user->id);

        $occurrences = $this->service->expandOccurrences($task, '2026-10-01', '2026-10-04');
        $byDate = collect($occurrences)->keyBy('dueDate');

        $this->assertFalse($byDate['2026-10-01']['completed']);
        $this->assertTrue($byDate['2026-10-02']['completed']);
        $this->assertArrayNotHasKey('2026-10-03', $byDate); // Skipped occurrence omitted
        $this->assertFalse($byDate['2026-10-04']['completed']);
    }

    public function test_edit_this_occurrence_detaches_instance(): void
    {
        $task = Task::create([
            'user_id' => $this->user->id,
            'title' => 'Original Series',
            'due_date' => '2026-10-01',
            'recurrence_pattern' => 'daily',
            'recurrence_interval' => 1,
        ]);

        $detached = $this->service->editThisOccurrence($task, '2026-10-02', [
            'title' => 'Modified Occurrence Only',
        ], $this->user->id);

        $this->assertTrue($detached->is_recurrence_exception);
        $this->assertEquals($task->id, $detached->recurrence_parent_id);
        $this->assertEquals('Modified Occurrence Only', $detached->title);

        $occurrences = $this->service->expandOccurrences($task, '2026-10-01', '2026-10-03');
        $byDate = collect($occurrences)->keyBy('dueDate');

        $this->assertEquals('Original Series', $byDate['2026-10-01']['title']);
        $this->assertEquals('Modified Occurrence Only', $byDate['2026-10-02']['title']);
        $this->assertEquals('Original Series', $byDate['2026-10-03']['title']);
    }
}
