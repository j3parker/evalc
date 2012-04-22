#include <bwio.h>
#include <task.h>
#include <switch.h>
#include <priority.h>
#include <user.h>
#include <kassert.h>
#include <syscall.h>

// test

TD tasks[MAX_TASKS+1];
char *user_stack_free = 0;
int highest_tid = 0;

/* Pointers to last thing in the ready queue */
TaskQ readyQ[PRI_IDLE + 1];

void print_task(TD *task) {
	bwprintf(COM2, "Task #%d\n\t", (int)task->tid);
	bwprintf(COM2, "sp = %x\n\t", (int)task->sp);
	bwprintf(COM2, "r0 = %x\n\t", (int)task->return_val);
	bwprintf(COM2, "pc = %x\n\t", (int)task->pc);
	bwprintf(COM2, "spsr = %x\n\t", (int)task->spsr);
}

/* Initialize tasks */
void task_init(void) {
	bwprintf(COM2, "\tSetting up tasks\n");
	for(int i=0; i<MAX_TASKS; i++) {
		tasks[i].state = NONEXIST;
	}
	for(int p = PRI_INTERRUPT; p <= PRI_IDLE; p++) {
		readyQ[p].head = 0;
		readyQ[p].tail = 0;
	}
	__asm( "ldr %0, =_text_end" : "=r" (user_stack_free));
	task_create(0,PRI_NORMAL, &init, INTERRUPTS_OFF);
}

/*-----------------------------------------------------*/

/* Return the TD corresponding to the given TID
 		Return -1 if the TID is invalid, -2 if it
  	does not refer to a living task */
TD *task_get(int tid) {
	if (tid <= 0 || tid > MAX_TASKS) {
		return (TD *)-1;
	} else 
		switch (tasks[tid].state) {
			case DEAD:
			case ZOMBIE:
			case NONEXIST:
				return (TD *)-2;
			case READY:
			case RECEIVE_BLOCKED:
			case SEND_BLOCKED:
			case REPLY_BLOCKED:
			case EVENT_BLOCKED:
				return &(tasks[tid]);
		}
	assert(0 && "Never Reached");
	return 0;
}

TD *Q_pop(TaskQ *Q) {
	assert(Q);
	if(Q->head) {
		TD *ret = Q->head;
		Q->head = Q->head->next;
		if(!Q->head) {
			Q->tail = 0;
		}
		ret->next = 0;
		return ret;
	} else {
		assert(!Q->tail);
		return 0;
	}
}

void Q_push(TD *task, TaskQ *Q) {
	assert(task);
	assert(Q);
	assert(task->next == 0);
	assert(task != Q->tail);
	assert(task != Q->head);
	if(Q->head) {
		assert(Q->tail);
		Q->tail->next = task;
		Q->tail = task;
	} else {
		assert(!Q->tail);
		Q->head = task;
		Q->tail = task;
	}
}

/*----------------------------------------------------*/

// Return the highest priority task currently ready to run
TD *task_getnext() {
	for(int p = PRI_INTERRUPT; p <= PRI_IDLE; p++) {
		if(readyQ[p].head) {
			assert(readyQ[p].tail);
			TD *r = Q_pop(&(readyQ[p]));
			assert(r != readyQ[p].tail);
			assert(r != readyQ[p].head);
			assert(r);
			assert(r->state == READY);
			return r;
		}
	}
	return 0;
}

// Set a task to execute
void task_setready(TD *task) {
	assert(task);
	int i = task->priority;
	task->state = READY;
	assert(i >= PRI_INTERRUPT && i <= PRI_IDLE);
	Q_push(task, &(readyQ[i]));
}

// Create a task
TD *task_create(int parent, int priority, void *code, int interrupts) {
	int tid = ++highest_tid;
	assert(tid);
	int *stack;
	TD *r;

	/* Error Checking */
	if (priority > PRI_IDLE || priority < PRI_INTERRUPT) { 
		bwprintf(COM2, "Create: Invalid priority level %d\n", priority);
		return 0;
	} else if (tid > MAX_TASKS) {
		bwprintf(COM2, "Create: Too many tasks\n");
		return 0;
	}
	r = &(tasks[tid]);
	r->lowstack = user_stack_free + 128; // 128 byte safety buffer
	// Allocate a stack
	user_stack_free += USR_STACK_SIZE;
	r->highstack = user_stack_free;
	// Assert we haven't run into the kernel stack
	__asm( "mov %0, sp" : "=r" (stack));
	assert ((int)user_stack_free < (int)stack);
	// Initialize registers on stack
	stack = (int *)user_stack_free;
	*(--stack) = (int)&code;
	*(--stack) = (int)&Fail;
	while(stack > (int *)user_stack_free - 14) {
		*(--stack) = 0;
	}

	r->next = 0;
	r->sp = (char *)stack;
	if(interrupts) {
		r->spsr = 0x10;
	} else {
		r->spsr = 0xD0;
	}
	r->pc = code;
	r->return_val = 0;
	r->priority = priority;
	r->tid = tid;
	r->parent = parent;
	r->state = READY;
	r->sendQ.head = 0;
	r->sendQ.tail = 0;
	r->cputime = 0;
	r->runCount = 0;

	task_setready(r);
	return r;
}