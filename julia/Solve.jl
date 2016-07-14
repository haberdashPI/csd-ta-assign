module Solve
export solve_problem

using JuMP
using AmplNLWriter
using Lazy: @>>
using Iterators
import Base: show

function getin(nested,keys,default)
  current = nested
  for key in keys
    if haskey(current,key)
      current = current[key]
    else
      return default
    end
  end
  return current
end

function setin(nested,keys,to)
  current = nested
  keys = collect(keys)
  for key in keys[1:(end-1)]
    if !haskey(current,key)
      current[key] = Dict()
    end
    current = current[key]
  end
  current[keys[end]] = to

  nested
end

const qorders = [[1 1 1];[1 2 3];[1 3 2];[2 1 3];[2 3 1];[3 1 2];[3 2 1]]

type Required
  i::Int
  j::Int
  hours::Int
end

type Problem
  # the original json representation describing the problem
  json::Dict

  # problem dimensions
  nstudents::Int
  ncourses::Int

  # the names of students and courses
  # used for updating the json representation
  students::Array{AbstractString}
  courses::Array{AbstractString}

  # number of hours a single assignment unit represents
  hunits::Float64

  # the ranking of each assignment choice (higher ranking, better choice)
  ranks::Array{Float64,2}

  # the set of required assignments
  required::Array{Required}

  # the total number of hours each student needs
  loads::Array{Int}

  # the total nubmer of hours each course needs
  course_total::Array{Int}

  # the number of students each course can have assigned
  course_range::Array{Int,2}

  # the set of courses for each quarter
  quarterc::Array{Array{Int}}

  # the prefered ordering of hour totals for each quarter
  qorder::Array{Int}

  # minimum and maximum difference between the total nubmer of hours and the
  # actual nubmer of hours each student has
  min_off::Int
  max_off::Array{Int}

  # the maximum number of units for any assignment
  maxunits::Int

  # the maximum number of units a student can have for any quarter
  quarter_maxunits::Int

  # the overall weight given to course rank in the objective function
  rankweight::Float64

  # the overall weight given to the hour totals for each quarter in
  # the objective function
  hourweight::Float64

  # the overall weight given to how similar the solution is to
  # some other similar solution in the objective function
  closetoweight::Float64
end

function Base.show(io::IO,p::Problem)
  println(io,"TA Assignment problem with")
  println(io,"$(p.nstudents) students and")
  println(io,"$(p.ncourses) courses.")
end

function setup_problem(problem,prefs)
  courses = collect(keys(problem["courses"]))
  course_indices = Dict([name => i for (i,name) in enumerate(courses)])
  students = collect(keys(problem["students"]))
  student_indices = Dict([name => i for (i,name) in enumerate(students)])

  function quarter_courses(quarter)
    @>> problem["courses"] begin
      filter((k,c) -> c["quarter"] == quarter)
      map(c -> course_indices[c.first])
    end
  end

  function assignment_rank(istudent,icourse)
    student,course = students[istudent],courses[icourse]
    extra_hours = getin(problem,["students",student,"allow_more_hours"],false)
    student_weight = (extra_hours ?
                      prefs["student_extrahour_weight"] :
                      prefs["student_weight"])

    (getin(problem["assignments"],[student,course,"studentRank"],
           prefs["default_student_rank"]) * student_weight) +
             (getin(problem["assignments"],[student,course,"instructorRank"],
                    prefs["default_instructor_rank"]) * prefs["instructor_weight"])
  end

  nstudents = length(problem["students"])
  ncourses = length(problem["courses"])

  hunits = prefs["hour_unit"]
  maxunits = round(Int,prefs["max_units"])
  quarter_maxunits = round(Int,prefs["quarter_max_units"])

  ranks = [assignment_rank(i,j) for i = 1:nstudents, j = 1:ncourses]

  reqs = Array{Required,1}()
  for i in 1:nstudents
    for j in 1:ncourses
      student,course = students[i],courses[j]
      hours = getin(problem["assignments"],[student,course,"hours"],0)
      fix = getin(problem["assignments"],[student,course,"fix"],false)
      if hours > 0 && fix
        units = round(Int,hours / hunits)
        push!(reqs,Required(i,j,units))
      end
    end
  end

  course_total = map(courses) do cid
    round(Int,float(problem["courses"][cid]["hours"]["total"])/hunits)
  end

  course_range = Array{Int,2}(ncourses,2)
  for (i,cid) in enumerate(courses)
    course_range[i,:] =
      round(Int,map(float,problem["courses"][cid]["hours"]["range"]))
  end

  quarterc = Array{Array{Int}}(3)
  quarterc[1] = quarter_courses("fall")
  quarterc[2] = quarter_courses("winter")
  quarterc[3] = quarter_courses("spring")

  qorder = map(students) do name
    orderi =
      round(Int,float(getin(problem,["students",name,"quarter_load"],0)))+1
    qorders[orderi]
  end

  loads = map(students) do name
    hours = float(getin(problem,["students",name,"total_hours"],0))
    round(Int,hours/hunits)
  end

  max_off = map(students) do name
    if getin(problem,["students",name,"allow_more_hours"],false)
      prefs["max_extra_over_units"]
    else
      prefs["max_over_units"]
    end
  end

  min_off = -prefs["max_under_units"]

  mean_student_weight = (sum(students) do x
    if getin(problem,["students",x,"allow_more_hours"],false)
      prefs["student_extrahour_weight"]
    else
      prefs["student_weight"]
    end
  end)/length(students)

  # 1 / numcoursese / rankscale
  rankweight = 1 / ncourses / mean_student_weight

  # 1 / numstudents / max dot product
  hourweight = 1 / nstudents / sum([3,2,1].^2)

  # 1 / numcourses
  closetoweight = 1 / ncourses

  Problem(problem,nstudents,ncourses,students,courses,hunits,ranks,reqs,loads,
          course_total,course_range,quarterc,qorder,min_off,max_off,maxunits,
          quarter_maxunits,rankweight,hourweight,closetoweight)
end

type Solution
  result::Symbol
  assignments::Array{Int,2}
end

Solution(r=:None) = Solution(r,Array{Int,2}())
function Solution(p::Problem,probjson::Dict)
  assignments = zeros(Int,(p.nstudents,p.ncourses))
  for i in 1:p.nstudents
    for j in 1:p.ncourses
      student,course = p.students[i],p.courses[j]
      hours = getin(probjson["assignments"],[student,course,"hours"],0)
      if hours > 0
        units = round(Int,hours / p.hunits)
        assignments[i,j] = units
      end
    end
  end
  solved = all(1:p.ncourses) do j
    p.course_total[j] == sum(assignments[:,j])
  end

  Solution((solved ? :Optimal : :Partial),assignments)
end

function setup_constraints(m,assignment,p::Problem,old::Solution)
  # maintain the correct representation of assignment hours
  for k = 2:p.maxunits
    @constraint(m,assignment[i=1:p.nstudents,j=1:p.ncourses,k] .≤
                assignment[i=1:p.nstudents,j=1:p.ncourses,k-1])
  end

  # the number of TAs for a course must fall within the required range
  for j in 1:p.ncourses
    @constraint(m,p.course_range[j,1] ≤
                sum{assignment[i,j,1],i=1:p.nstudents} ≤
                p.course_range[j,2])
  end

  # all classes must have the right number of total hours
  @constraint(m,p.course_total[j=1:p.ncourses]' .==
              sum{assignment[i,j,k], i=1:p.nstudents,k=1:p.maxunits})

  # students cannot have more than the max hours in a quarter
  if !isempty(p.quarterc[1])
    @constraint(m,sum{assignment[i=1:p.nstudents,j,k], j=p.quarterc[1],
                      k=1:p.maxunits} .≤ p.quarter_maxunits)
  elseif !isempty(p.quarterc[1])
    @constraint(m,sum{assignment[i=1:p.nstudents,j,k], j=p.quarterc[2],
                      k=1:p.maxunits} .≤ p.quarter_maxunits)
  elseif !isempty(p.quarterc[3])
    @constraint(m,sum{assignment[i=1:p.nstudents,j,k], j=p.quarterc[3],
                      k=1:p.maxunits} .≤ p.quarter_maxunits)
  end

  # students' overall load cannot be too far off from their target load
  @constraint(m,p.min_off .≤
              sum{assignment[i,j,k], j=1:p.ncourses,k=1:p.maxunits} -
              p.loads[i=1:p.nstudents].≤
              p.max_off[i])

  # all required assignments must be satisfied
  for req = p.required
    @constraint(m,sum{assignment[req.i,req.j,k],k=1:p.maxunits} ==
                req.hours)
  end

  # new solutions cannot have the same exact sum of assignment ranks in the
  # same assignment locations as an old, valid solution: this guarantees the
  # new solution is different.
  #
  # NOTE: Some different solutions will be missed by this approach because they
  # will not satisfy this constraint. However, they will be trivially different:
  # differing only in the distribution of hours alloted between courses that are
  # equally ranked. This approach has the advantage that it can be expressed as
  # a linear constraint
  if old.result == :Optimal
    position = old.assignments .> 0
    oldsum = sum(old.assignments .* position .* p.ranks)
    @constraint(m,sum{assignment[i,j,k]*p.ranks[i,j]*position[i,j],
                      i=1:p.nstudents,j=1:p.ncourses,
                      k=1:p.maxunits} ≤ oldsum-1)
  end

  m
end

function setup_objective(m,assignment,p::Problem)
  const divisor = 1 / p.ncourses

  @objective(m,:Max,
             # we want the highest rank possible
             p.rankweight *
             sum{assignment[i,j,k]*p.ranks[i,j],
                 i=1:p.nstudents,j=1:p.ncourses,k=1:p.maxunits} +

             # we prefer qorder[1] > qorder[2] > qorder[3]
             3*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i],1]],
                                k=1:p.maxunits} +

             2*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i],2]],
                                k=1:p.maxunits} +

             1*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i],3]],
                                k=1:p.maxunits})
  m
end

function setup_objective(m,assignment,p::Problem,closeto)
  @objective(m,:Max,
             # we want the highest rank possible
             p.rankweight *
             sum{assignment[i,j,k]*p.ranks[i,j],
                 i=1:p.nstudents,j=1:p.ncourses,k=1:p.maxunits} +

             # we want a solution close to the old one
             p.closetoweight *
             sum{assignment[i,j,k] * closeto[i,j],
                 i=1:p.nstudents,j=1:p.ncourses,k=1:p.maxunits} +

             # we prefer qorder[1] > qorder[2] > qorder[3]
             3*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i]][1]],
                                k=1:p.maxunits} +

             2*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i]][2]],
                                k=1:p.maxunits} +

             1*p.hourweight*sum{assignment[i,j,k],
                                i=1:p.nstudents,
								j=p.quarterc[qorders[p.qorder[i]][3]],
                                k=1:p.maxunits})
  m
end

function assign_hours(p::Problem,old=Solution();
                      timelimit=5,closeto=false)
  # TODO: figure out how to specify a timelimit for CBC.
  m = Model()
  # m = Model(solver=BonminNLSolver(["bonmin.time_limit=$timelimit"]))
  # m = Model(solver=CouenneNLSolver())

  @variable(m,0 ≤ assignment[1:p.nstudents,1:p.ncourses,1:p.maxunits] ≤ 1,Int)

  m = setup_constraints(m,assignment,p,old)

  if closeto
    m = setup_objective(m,assignment,p,old.assignments)
  else
    m = setup_objective(m,assignment,p)
  end

  result = solve(m)

  if result == :Optimal
    a = getvalue(assignment)
    Solution(result,sum(a,3)[:,:,1])
  else
    Solution(result)
  end
end

function represent_solution(p::Problem,solution::Solution)
  represent_solution(p,solution.assignments)
end

function represent_solution(p::Problem,solution::Array{Int,2})
  result = deepcopy(p.json)

  for i = 1:p.nstudents
    for j = 1:p.ncourses
      if solution[i,j] > 0
        result = setin(result,
                       ["assignments",p.students[i],p.courses[j],"hours"],
                       p.hunits * solution[i,j])
      else
        result = setin(result,
                       ["assignments",p.students[i],p.courses[j],"hours"],0)
      end
    end
  end

  result
end

function solve_problem(problem,prefs)
  p = setup_problem(problem,prefs)
  if prefs["closeto"] || prefs["differentfrom"]
    s = assign_hours(p,Solution(p,problem))
  else
    s = assign_hours(p)
  end

  if s.result == :Optimal
    Dict("result" => "optimal",
         "solution" => represent_solution(p,s))
  elseif s.result == :Infeasible
    Dict("result" => "infeasible")
  else
    Dict("result" => "error",
         "message" => "Solver returned: "*string(s.result))
  end
end

end
