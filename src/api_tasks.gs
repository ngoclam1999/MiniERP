var MINI_ERP_TASK_TYPES=['machining','electrical_cabinet','plc','assembly','commissioning','design','other'];
var MINI_ERP_TASK_STATUSES=['wait','doing','qc','done'];
function registerTaskActions_(){
  registerActionOnce_('task.list',function(p){var ctx=getAuthContext_();requireRole(ctx,['director','manager','engineer','purchasing','warehouse','hr','employee']);return listTasks_(ctx,p||{});},false);
  registerActionOnce_('task.create',function(p){var ctx=getAuthContext_();requireRole(ctx,['manager','engineer','employee']);return createTask_(ctx,p);},true);
  registerActionOnce_('task.update',function(p){var ctx=getAuthContext_();requireRole(ctx,['manager','engineer','employee']);return updateTask_(ctx,p&&p.task_id,p&&p.patch);},true);
  registerActionOnce_('task.move',function(p){var ctx=getAuthContext_();requireRole(ctx,['manager','engineer','employee']);return moveTask_(ctx,p&&p.task_id,p&&p.status,p&&p.force,p&&p.reason);},true);
  registerActionOnce_('calendar.list',function(p){var ctx=getAuthContext_();requireRole(ctx,['director','manager','engineer','purchasing','warehouse','accountant','hr','employee']);return listCalendarEvents_(ctx,p||{});},false);
}
function taskRoles_(ctx){return[ctx.role].concat(ctx.extra_roles||[]);}
function requireTaskOwner_(ctx,assignee){var roles=taskRoles_(ctx);if(roles.indexOf('admin')<0&&roles.indexOf('manager')<0&&String(assignee)!==String(ctx.emp_id))throw apiError('FORBIDDEN','Kỹ sư chỉ được thao tác công việc của chính mình.');}
function validateTask_(p){if(!p||!p.project_id||!p.title||!p.assignee_emp_id||!/^\d{4}-\d{2}-\d{2}$/.test(String(p.due_date||'')))throw apiError('VALIDATION','Công việc cần dự án, tiêu đề, người phụ trách và hạn hợp lệ.');var project=findById('Projects',p.project_id);if(!project)throw apiError('NOT_FOUND','Không tìm thấy dự án: '+p.project_id,'project_id');if(!findById('Employees',p.assignee_emp_id))throw apiError('NOT_FOUND','Không tìm thấy nhân viên: '+p.assignee_emp_id,'assignee_emp_id');if(MINI_ERP_TASK_TYPES.indexOf(String(p.type||'other'))<0)throw apiError('VALIDATION','Loại công việc không hợp lệ.','type');if(MINI_ERP_TASK_STATUSES.indexOf(String(p.status||'wait'))<0)throw apiError('VALIDATION','Trạng thái công việc không hợp lệ.','status');if(p.depends_on&&!findById('Tasks',p.depends_on))throw apiError('NOT_FOUND','Không tìm thấy công việc phụ thuộc: '+p.depends_on,'depends_on');return{project:project,warning:String(p.due_date)>String(project.due_date||'')?'Hạn công việc vượt hạn dự án.':''};}
function shapeTask_(row){var x=copyDbObject_(row),project=findById('Projects',row.project_id)||{},employee=findById('Employees',row.assignee_emp_id)||{};x.project_name=project.name||'';x.assignee_name=employee.full_name||'';x.due_warning=String(row.due_date)>String(project.due_date||'')?'Hạn công việc vượt hạn dự án.':'';return x;}
function listTasks_(ctx,filter){var roles=taskRoles_(ctx),rows=readAll('Tasks'),projectId=String(filter.project_id||''),status=String(filter.status||''),assignee=String(filter.assignee_emp_id||'');if(roles.indexOf('manager')>=0&&roles.indexOf('admin')<0&&roles.indexOf('director')<0){var managed={};readAll('Projects').forEach(function(x){if(String(x.pm_emp_id)===String(ctx.emp_id))managed[String(x.project_id)]=true;});rows=rows.filter(function(x){return managed[String(x.project_id)];});}else if(roles.every(function(r){return['admin','director','manager','purchasing','warehouse','hr'].indexOf(r)<0;}))rows=rows.filter(function(x){return String(x.assignee_emp_id)===String(ctx.emp_id);});return rows.filter(function(x){return(!projectId||String(x.project_id)===projectId)&&(!status||String(x.status)===status)&&(!assignee||String(x.assignee_emp_id)===assignee);}).map(shapeTask_);}
function createTask_(ctx,p){requireProjectAccess(ctx,p&&p.project_id);requireTaskOwner_(ctx,p&&p.assignee_emp_id);var check=validateTask_(p),id=nextId('TASK'),row=insert('Tasks',{task_id:id,project_id:p.project_id,title:String(p.title),type:String(p.type||'other'),assignee_emp_id:p.assignee_emp_id,start_date:String(p.start_date||''),due_date:String(p.due_date),status:String(p.status||'wait'),progress_pct:Number(p.progress_pct||0),depends_on:String(p.depends_on||''),priority:String(p.priority||'normal'),qc_by:String(p.qc_by||check.project.pm_emp_id||'')});return{task:shapeTask_(row),warning:check.warning};}
function updateTask_(ctx,id,patch){var task=findById('Tasks',id);if(!task)throw apiError('NOT_FOUND','Không tìm thấy công việc: '+id);requireProjectAccess(ctx,task.project_id);requireTaskOwner_(ctx,task.assignee_emp_id);var merged=copyDbObject_(task);Object.keys(patch||{}).forEach(function(k){merged[k]=patch[k];});requireTaskOwner_(ctx,merged.assignee_emp_id);if(String(merged.depends_on||'')===String(id))throw apiError('VALIDATION','Công việc không thể phụ thuộc chính nó.','depends_on');var check=validateTask_(merged);delete merged.task_id;return{task:shapeTask_(update('Tasks',id,merged)),warning:check.warning};}
function taskUserEmail_(empId){var user=readAll('Users').filter(function(x){return String(x.emp_id)===String(empId)&&String(x.status)==='active';})[0];return user?String(user.email):'';}
function moveTask_(ctx,id,status,force,reason){
  var task=findById('Tasks',id);if(!task)throw apiError('NOT_FOUND','Không tìm thấy công việc: '+id);
  var roles=taskRoles_(ctx),isManager=roles.indexOf('admin')>=0||roles.indexOf('manager')>=0,isQc=String(task.qc_by)===String(ctx.emp_id);
  if(!isQc)requireProjectAccess(ctx,task.project_id);
  if(!isManager&&!isQc)requireTaskOwner_(ctx,task.assignee_emp_id);
  status=String(status);if(MINI_ERP_TASK_STATUSES.indexOf(status)<0)throw apiError('VALIDATION','Trạng thái công việc không hợp lệ.','status');
  var from=String(task.status),allowed={wait:['doing'],doing:['wait','qc'],qc:['doing','done'],done:[]};
  if((allowed[from]||[]).indexOf(status)<0)throw apiError('INVALID_STATE','Không thể chuyển công việc từ '+from+' sang '+status+'.');
  if(status==='doing'&&task.depends_on){var dependency=findById('Tasks',task.depends_on);if(dependency&&String(dependency.status)!=='done'&&!(force&&isManager))throw apiError('INVALID_STATE','Công việc phụ thuộc '+task.depends_on+' chưa hoàn thành.');}
  if(from==='qc'&&status==='doing'&&!String(reason||'').trim())throw apiError('VALIDATION','Bắt buộc nhập lý do trả công việc về Đang làm.','reason');
  if(status==='done'&&!isManager&&!isQc)throw apiError('FORBIDDEN','Chỉ người kiểm tra hoặc quản lý được hoàn thành công việc.');
  var result=shapeTask_(update('Tasks',id,{status:status,progress_pct:status==='done'?100:status==='qc'?90:status==='doing'?50:0}));
  if(status==='qc'){var qcEmail=taskUserEmail_(task.qc_by);if(qcEmail)createNotification(qcEmail,'Công việc chờ kiểm tra',task.title+' · '+task.project_id,'#tasks');else result.move_warning='Người kiểm tra chưa có tài khoản hoạt động để nhận thông báo.';}
  if(from==='qc'&&status==='doing'){var ownerEmail=taskUserEmail_(task.assignee_emp_id);if(ownerEmail)createNotification(ownerEmail,'Công việc cần chỉnh sửa',task.title+' · '+String(reason).trim(),'#tasks');result.return_reason=String(reason).trim();}
  result.project_progress_pct=withProjectProgress_(findById('Projects',task.project_id)).progress_pct;
  return result;
}
function listCalendarEvents_(ctx,filter){
  var month=String(filter.month||Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM'));
  if(!/^\d{4}-\d{2}$/.test(month))throw apiError('VALIDATION','Tháng phải có định dạng YYYY-MM.','month');
  var start=month+'-01',end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10),requested=String(filter.project_id||''),projects={};
  listProjects_(ctx).forEach(function(x){if(!requested||String(x.project_id)===requested)projects[String(x.project_id)]=x;});
  if(requested&&!projects[requested])throw apiError('FORBIDDEN','Bạn không có quyền xem lịch của dự án này.');
  var out=[],inMonth=function(date){date=String(date||'');return date>=start&&date<=end;},add=function(type,date,endDate,title,projectId,refId){if(!projects[String(projectId)]||!inMonth(date))return;out.push({event_id:type+'-'+refId,type:type,date:String(date),end_date:String(endDate||''),title:String(title),project_id:String(projectId),project_name:String(projects[String(projectId)].name||''),ref_id:String(refId)});};
  readAll('Tasks').forEach(function(x){add('task',x.due_date,'','Hạn: '+x.title,x.project_id,x.task_id);});
  var poById={};readAll('PO').forEach(function(x){poById[String(x.po_id)]=x;});readAll('POLines').forEach(function(x){var po=poById[String(x.po_id)];if(po&&String(po.status)!=='cancelled'&&Number(x.qty_received||0)<Number(x.qty||0))add('eta',x.eta_date,'','Hàng về: '+x.sku,x.project_id,x.line_id);});
  readAll('ProjectPayments').forEach(function(x){add('payment',x.due_date,'','Thanh toán: '+x.name,x.project_id,x.pay_id);});
  readAll('Requests').forEach(function(x){if(String(x.type)!=='trip'||String(x.status)!=='approved')return;var from=String(x.from_date||''),to=String(x.to_date||from);if(projects[String(x.project_id)]&&from<=end&&to>=start)out.push({event_id:'trip-'+x.req_id,type:'trip',date:from<start?start:from,end_date:to>end?end:to,title:'Công tác: '+x.emp_id,project_id:String(x.project_id),project_name:String(projects[String(x.project_id)].name||''),ref_id:String(x.req_id)});});
  Object.keys(projects).forEach(function(id){var p=projects[id];add('handover',p.due_date,'','Bàn giao: '+p.name,id,id);});
  return out.sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.type).localeCompare(String(b.type));});
}
